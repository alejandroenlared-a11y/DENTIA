import { execSync } from "node:child_process";
import type { DentalAgentRuntime } from "../../src/lib/agent/openai-dental-agent";
import type { ClaraEvaluationResult } from "../../src/lib/agent/clara-evaluation";

// FINAL-DENTIA-CLOSEOUT Fase 3: distingue de forma inequivoca si un turno
// llamo de verdad a Gemini/OpenAI, cayo a fallback local, o si el proveedor
// devolvio texto libre no estructurado (degradado, pero tecnicamente "runtime
// gemini"). Nunca se guarda el texto de la respuesta ni la API key - solo
// runtime/modelo/motivo de fallback (ya publicos en el propio informe).
export type LlmTurnObservation = {
  runtime: DentalAgentRuntime;
  model: string;
  fallbackReason?: string;
};

export type LlmRunSummary = {
  commitSha: string;
  date: string;
  requestedProvider: string;
  primaryModelConfigured: string;
  fallbackModelConfigured: string;
  totalTurns: number;
  geminiTurns: number;
  openaiTurns: number;
  geminiFreeformTurns: number;
  localFallbackTurns: number;
  fallbackPercentage: number;
  schemaErrors: number;
  timeouts: number;
  fallbackReasonGroups: Array<{ reason: string; count: number }>;
};

const TIMEOUT_PREFIX = "Sin respuesta del proveedor externo";
const SCHEMA_ERROR_PREFIX = "Salida IA invalida";

function isFreeformModel(model: string): boolean {
  return model.includes("texto libre");
}

// Agrupa motivos de fallback quitando el detalle variable (codigos HTTP,
// nombres de modelo de fallback concretos) para que "Gemini API 429" y
// "Gemini API 500" no exploten en decenas de grupos de una sola entrada.
function bucketFallbackReason(reason: string): string {
  if (reason.startsWith(TIMEOUT_PREFIX)) return "timeout";
  if (reason.startsWith(SCHEMA_ERROR_PREFIX)) return "schema invalido (Salida IA invalida)";
  if (/^Gemini API \d+/.test(reason)) return reason.replace(/^Gemini API \d+.*/, match => match.split(";")[0]);
  if (/^OpenAI API \d+/.test(reason)) return reason.replace(/;.*/, "");
  if (reason.includes("no configurada")) return reason;
  return reason;
}

export function summarizeLlmObservations(
  observations: LlmTurnObservation[],
  input: { requestedProvider: string; primaryModelConfigured: string; fallbackModelConfigured: string }
): LlmRunSummary {
  let geminiTurns = 0;
  let openaiTurns = 0;
  let geminiFreeformTurns = 0;
  let localFallbackTurns = 0;
  let schemaErrors = 0;
  let timeouts = 0;
  const fallbackReasonCounts = new Map<string, number>();

  for (const observation of observations) {
    if (observation.runtime === "gemini" && isFreeformModel(observation.model)) {
      geminiFreeformTurns += 1;
    } else if (observation.runtime === "gemini") {
      geminiTurns += 1;
    } else if (observation.runtime === "openai") {
      openaiTurns += 1;
    } else {
      localFallbackTurns += 1;
    }

    if (observation.fallbackReason) {
      if (observation.fallbackReason.startsWith(TIMEOUT_PREFIX)) timeouts += 1;
      if (observation.fallbackReason.startsWith(SCHEMA_ERROR_PREFIX)) schemaErrors += 1;
      const bucket = bucketFallbackReason(observation.fallbackReason);
      fallbackReasonCounts.set(bucket, (fallbackReasonCounts.get(bucket) ?? 0) + 1);
    }
  }

  const totalTurns = observations.length;
  const fallbackPercentage = totalTurns > 0 ? Math.round((localFallbackTurns / totalTurns) * 1000) / 10 : 0;

  return {
    commitSha: getCommitSha(),
    date: new Date().toISOString(),
    requestedProvider: input.requestedProvider,
    primaryModelConfigured: input.primaryModelConfigured,
    fallbackModelConfigured: input.fallbackModelConfigured,
    totalTurns,
    geminiTurns,
    openaiTurns,
    geminiFreeformTurns,
    localFallbackTurns,
    fallbackPercentage,
    schemaErrors,
    timeouts,
    fallbackReasonGroups: [...fallbackReasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
  };
}

export function getCommitSha(): string {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "(no disponible - no es un repositorio git)";
  }
}

export function buildLlmSummaryMarkdown(summary: LlmRunSummary): string[] {
  return [
    "## Ejecucion LLM (runtime real vs fallback)",
    "",
    `- Commit evaluado: \`${summary.commitSha}\``,
    `- Fecha: ${summary.date}`,
    `- Proveedor solicitado (LLM_PROVIDER): ${summary.requestedProvider}`,
    `- Modelo principal configurado: ${summary.primaryModelConfigured}`,
    `- Modelo fallback configurado: ${summary.fallbackModelConfigured}`,
    `- Turnos totales: ${summary.totalTurns}`,
    `- Turnos Gemini (reales, estructurados): ${summary.geminiTurns}`,
    `- Turnos OpenAI (reales, estructurados): ${summary.openaiTurns}`,
    `- Turnos Gemini con texto libre (degradado, no estructurado): ${summary.geminiFreeformTurns}`,
    `- Turnos con fallback local: ${summary.localFallbackTurns}`,
    `- Porcentaje de fallback local: ${summary.fallbackPercentage}%`,
    `- Errores de schema (JSON invalido): ${summary.schemaErrors}`,
    `- Timeouts: ${summary.timeouts}`,
    "",
    "### Motivos de fallback agrupados",
    ""
  ].concat(
    summary.fallbackReasonGroups.length === 0
      ? ["Ninguno."]
      : summary.fallbackReasonGroups.map(group => `- ${group.reason}: ${group.count}`)
  );
}

export type RealLlmGateResult = { ok: boolean; reasons: string[] };

// Fase 3.1/3.3 (FINAL-DENTIA-CLOSEOUT): con REQUIRE_REAL_LLM=1 activo, un
// aviso en consola ya no basta - la ejecucion debe terminar con codigo
// distinto de cero si no hubo llamadas reales, si el proveedor pedido no es
// el que realmente respondio, o si el fallback supera el umbral.
export function evaluateRealLlmGate(
  summary: LlmRunSummary,
  evaluation: Pick<ClaraEvaluationResult, "criticalFailures" | "conversations">,
  options: { requireReal: boolean; maxFallbackPercentage: number }
): RealLlmGateResult {
  if (!options.requireReal) {
    return { ok: true, reasons: [] };
  }

  const reasons: string[] = [];
  const realLlmTurns = summary.geminiTurns + summary.openaiTurns;

  if (realLlmTurns === 0) {
    reasons.push("Ningun turno llamo de verdad a Gemini/OpenAI (todo fue fallback local o texto libre).");
  }
  if (summary.requestedProvider === "gemini" && summary.openaiTurns > 0) {
    reasons.push(`Proveedor solicitado era Gemini pero ${summary.openaiTurns} turno(s) usaron OpenAI.`);
  }
  if (summary.requestedProvider === "openai" && summary.geminiTurns > 0) {
    reasons.push(`Proveedor solicitado era OpenAI pero ${summary.geminiTurns} turno(s) usaron Gemini.`);
  }
  if (summary.fallbackPercentage > options.maxFallbackPercentage) {
    reasons.push(`Fallback local (${summary.fallbackPercentage}%) supera el umbral permitido (${options.maxFallbackPercentage}%).`);
  }
  if (evaluation.criticalFailures > 0) {
    reasons.push(`${evaluation.criticalFailures} fallo(s) critico(s) en la evaluacion.`);
  }
  if (summary.schemaErrors > 0) {
    reasons.push(`${summary.schemaErrors} turno(s) con JSON invalido del proveedor (oculto en fallback).`);
  }

  return { ok: reasons.length === 0, reasons };
}
