import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { evaluateClaraConversationsWithRunner, type ClaraTurnRunner } from "../src/lib/agent/clara-evaluation";
import { runDentalAgentTurn, type DentalChatMessage } from "../src/lib/agent/openai-dental-agent";
import { loadFixtures, printReport, writeMarkdownReport } from "./lib/clara-report";
import {
  buildLlmSummaryMarkdown,
  evaluateRealLlmGate,
  parseStrictPercentageEnv,
  summarizeLlmObservations,
  type LlmTurnObservation
} from "./lib/clara-llm-report";

// A diferencia de evaluate-clara.ts (motor local deterministico), este
// script corre el mismo banco de fixtures contra el LLM real
// (runDentalAgentTurn): clara-evaluation.ts nunca ejercitaba el path
// OpenAI/Gemini, asi que un guardrail roto o una regresion de prompt solo
// se veia en produccion.
//
// FINAL-DENTIA-CLOSEOUT Fase 3: un AVISO en consola ya no basta para
// demostrar si Gemini fue usado de verdad. Con REQUIRE_REAL_LLM=1 la
// ejecucion termina con codigo distinto de cero si no hubo llamadas reales,
// si el proveedor solicitado no coincide con el que realmente respondio, o
// si el fallback local supera el umbral (MAX_FALLBACK_PERCENTAGE, 0 por
// defecto - una ejecucion "limpia" no debe caer a fallback nunca).
const observations: LlmTurnObservation[] = [];

const runTurn: ClaraTurnRunner = async (state, message, historySoFar) => {
  const history: DentalChatMessage[] = historySoFar.flatMap(turn => [
    { role: "patient", body: turn.patient } as const,
    { role: "assistant", body: turn.clara } as const
  ]);
  const turn = await runDentalAgentTurn({ latestPatientMessage: message, history, state });
  observations.push({ runtime: turn.runtime, model: turn.model, fallbackReason: turn.fallbackReason });
  return { reply: turn.reply, state: turn.state };
};

async function main() {
  const requireReal = process.env.REQUIRE_REAL_LLM === "1";
  // Codex (Bloqueante 6 - "validar la config ANTES de ejecutar nada"): un
  // MAX_FALLBACK_PERCENTAGE corrupto debe cortar la ejecucion antes de gastar
  // llamadas reales al LLM, no despues - se valida como primer paso de main(),
  // antes de tocar fixtures o el runner.
  const percentageResult = parseStrictPercentageEnv("MAX_FALLBACK_PERCENTAGE", process.env.MAX_FALLBACK_PERCENTAGE, 0);
  if (!percentageResult.valid) {
    // Nunca se imprime rawValue si pudiera contener un secreto - esta
    // variable es exclusivamente un porcentaje numerico, nunca una credencial,
    // asi que mostrarla tal cual no expone nada sensible.
    const message = `${percentageResult.name} invalido: "${percentageResult.rawValue}". Debe ser un numero finito entre 0 y 100.`;
    if (requireReal) {
      console.error(`REQUIRE_REAL_LLM=1: configuracion invalida, no se ejecuta la evaluacion. ${message}`);
      process.exitCode = 1;
      return;
    }
    console.warn(`AVISO: ${message} Se usa el valor por defecto seguro (0%).`);
  }
  const maxFallbackPercentage = percentageResult.valid ? percentageResult.value : 0;

  const fixtureDir = resolve(process.cwd(), "tests/fixtures");
  const reportPath = resolve(process.cwd(), "reports/clara-evaluation-llm.md");
  const jsonReportPath = resolve(process.cwd(), "reports/clara-evaluation-llm.json");
  const fixtures = loadFixtures(fixtureDir);

  const result = await evaluateClaraConversationsWithRunner(fixtures, runTurn);

  const summary = summarizeLlmObservations(observations, {
    requestedProvider: process.env.LLM_PROVIDER === "gemini" ? "gemini" : "openai",
    primaryModelConfigured:
      (process.env.LLM_PROVIDER === "gemini" ? process.env.GEMINI_MODEL : process.env.OPENAI_MODEL) ||
      "(no configurado - usa el default de codigo)",
    fallbackModelConfigured: process.env.GEMINI_FALLBACK_MODEL || "(no configurado - usa el default de codigo)"
  });

  printReport(result, "Clara LLM evaluation");
  console.log("");
  for (const line of buildLlmSummaryMarkdown(summary)) console.log(line);

  writeMarkdownReport(result, reportPath, "Evaluacion del LLM real de Clara", {
    prelude: buildLlmSummaryMarkdown(summary)
  });
  mkdirSync(dirname(jsonReportPath), { recursive: true });
  writeFileSync(jsonReportPath, `${JSON.stringify({ summary, ...result }, null, 2)}\n`);

  console.log("");
  console.log(`Markdown report: ${reportPath}`);
  console.log(`JSON report: ${jsonReportPath}`);

  const gate = evaluateRealLlmGate(summary, result, { requireReal, maxFallbackPercentage });
  if (!gate.ok) {
    console.log("");
    console.log("REQUIRE_REAL_LLM=1: la ejecucion NO demuestra uso real del LLM. Motivos:");
    for (const reason of gate.reasons) console.log(`- ${reason}`);
    process.exitCode = 1;
    return;
  }

  if (!requireReal && summary.geminiTurns + summary.openaiTurns === 0) {
    console.log("");
    console.log("AVISO: ningun turno llamo a un proveedor LLM real (credenciales no configuradas o proveedor no disponible).");
    console.log("Este resultado solo valida el fallback local + guardrails, no el comportamiento real del LLM.");
    console.log("Ejecuta con REQUIRE_REAL_LLM=1 para que esto falle explicitamente en vez de solo avisar.");
  }

  if (result.score < 95 || result.criticalFailures > 0 || result.conversations.some(conversation => conversation.failed.length > 0)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error("Fallo evaluando a Clara contra el LLM real:", error);
  process.exitCode = 1;
});
