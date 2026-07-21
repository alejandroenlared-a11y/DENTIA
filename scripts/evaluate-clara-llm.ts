import { resolve } from "node:path";
import { evaluateClaraConversationsWithRunner, type ClaraTurnRunner } from "../src/lib/agent/clara-evaluation";
import { runDentalAgentTurn, type DentalAgentRuntime, type DentalChatMessage } from "../src/lib/agent/openai-dental-agent";
import { loadFixtures, printReport, writeMarkdownReport, writeJsonReport } from "./lib/clara-report";

// A diferencia de evaluate-clara.ts (motor local deterministico), este
// script corre el mismo banco de fixtures contra el LLM real
// (runDentalAgentTurn): clara-evaluation.ts nunca ejercitaba el path
// OpenAI/Gemini, asi que un guardrail roto o una regresion de prompt solo
// se veia en produccion.
const runtimeCounts: Record<DentalAgentRuntime, number> = { openai: 0, gemini: 0, local: 0 };

const runTurn: ClaraTurnRunner = async (state, message, historySoFar) => {
  const history: DentalChatMessage[] = historySoFar.flatMap(turn => [
    { role: "patient", body: turn.patient } as const,
    { role: "assistant", body: turn.clara } as const
  ]);
  const turn = await runDentalAgentTurn({ latestPatientMessage: message, history, state });
  runtimeCounts[turn.runtime] += 1;
  return { reply: turn.reply, state: turn.state };
};

async function main() {
  const fixtureDir = resolve(process.cwd(), "tests/fixtures");
  const reportPath = resolve(process.cwd(), "reports/clara-evaluation-llm.md");
  const jsonReportPath = resolve(process.cwd(), "reports/clara-evaluation-llm.json");
  const fixtures = loadFixtures(fixtureDir);

  const result = await evaluateClaraConversationsWithRunner(fixtures, runTurn);

  printReport(result, "Clara LLM evaluation");
  writeMarkdownReport(result, reportPath, "Evaluacion del LLM real de Clara");
  writeJsonReport(result, jsonReportPath);

  console.log("");
  console.log(`Turnos por runtime: openai=${runtimeCounts.openai} gemini=${runtimeCounts.gemini} local(fallback)=${runtimeCounts.local}`);
  const realLlmTurns = runtimeCounts.openai + runtimeCounts.gemini;
  if (realLlmTurns === 0) {
    console.log("");
    console.log("AVISO: ningun turno llamo a un proveedor LLM real (credenciales no configuradas o proveedor no disponible).");
    console.log("Este resultado solo valida el fallback local + guardrails, no el comportamiento real del LLM.");
  }
  console.log("");
  console.log(`Markdown report: ${reportPath}`);
  console.log(`JSON report: ${jsonReportPath}`);

  if (result.score < 95 || result.criticalFailures > 0 || result.conversations.some(conversation => conversation.failed.length > 0)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error("Fallo evaluando a Clara contra el LLM real:", error);
  process.exitCode = 1;
});
