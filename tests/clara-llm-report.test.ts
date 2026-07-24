import { describe, expect, it } from "vitest";
import { evaluateRealLlmGate, summarizeLlmObservations, type LlmTurnObservation } from "../scripts/lib/clara-llm-report";

const baseInput = {
  requestedProvider: "gemini",
  primaryModelConfigured: "gemini-3.1-flash-lite",
  fallbackModelConfigured: "gemini-3.5-flash"
};

describe("summarizeLlmObservations", () => {
  it("clasifica turnos gemini/openai/local y detecta timeouts y errores de schema", () => {
    const observations: LlmTurnObservation[] = [
      { runtime: "gemini", model: "gemini-3.1-flash-lite" },
      { runtime: "gemini", model: "gemini-3.1-flash-lite (texto libre)", fallbackReason: "Gemini devolvio texto libre" },
      { runtime: "local", model: "gemini-3.1-flash-lite", fallbackReason: "Sin respuesta del proveedor externo en 12s" },
      { runtime: "local", model: "gemini-3.1-flash-lite", fallbackReason: "Salida IA invalida en intent: schema mismatch" },
      { runtime: "openai", model: "gpt-5.6-terra" }
    ];

    const summary = summarizeLlmObservations(observations, baseInput);

    expect(summary.totalTurns).toBe(5);
    expect(summary.geminiTurns).toBe(1);
    expect(summary.geminiFreeformTurns).toBe(1);
    expect(summary.openaiTurns).toBe(1);
    expect(summary.localFallbackTurns).toBe(2);
    expect(summary.timeouts).toBe(1);
    expect(summary.schemaErrors).toBe(1);
    expect(summary.fallbackPercentage).toBe(40);
  });

  it("no oculta un fallback real detras de un porcentaje bajo - cada motivo queda agrupado y contable", () => {
    const observations: LlmTurnObservation[] = [
      { runtime: "gemini", model: "gemini-3.1-flash-lite" },
      { runtime: "local", model: "gemini-3.1-flash-lite", fallbackReason: "Gemini API 429" }
    ];
    const summary = summarizeLlmObservations(observations, baseInput);
    expect(summary.fallbackReasonGroups).toContainEqual({ reason: "Gemini API 429", count: 1 });
  });
});

describe("evaluateRealLlmGate (PR de cierre: REQUIRE_REAL_LLM=1 no puede aceptar un fallback silencioso)", () => {
  const cleanEvaluation = { criticalFailures: 0, conversations: [] };

  it("con requireReal=false siempre pasa, aunque todo sea fallback local", () => {
    const summary = summarizeLlmObservations([{ runtime: "local", model: "x", fallbackReason: "GEMINI_API_KEY no configurada" }], baseInput);
    const gate = evaluateRealLlmGate(summary, cleanEvaluation, { requireReal: false, maxFallbackPercentage: 0 });
    expect(gate.ok).toBe(true);
  });

  it("con requireReal=true y cero turnos reales, falla explicitamente", () => {
    const summary = summarizeLlmObservations([{ runtime: "local", model: "x", fallbackReason: "GEMINI_API_KEY no configurada" }], baseInput);
    const gate = evaluateRealLlmGate(summary, cleanEvaluation, { requireReal: true, maxFallbackPercentage: 0 });
    expect(gate.ok).toBe(false);
    expect(gate.reasons.some(reason => reason.includes("Ningun turno llamo de verdad"))).toBe(true);
  });

  it("un JSON invalido de Gemini oculto en fallback no puede pasar aunque el resto de turnos sean reales", () => {
    const summary = summarizeLlmObservations(
      [
        { runtime: "gemini", model: "gemini-3.1-flash-lite" },
        { runtime: "local", model: "gemini-3.1-flash-lite", fallbackReason: "Salida IA invalida en intent: schema mismatch" }
      ],
      baseInput
    );
    const gate = evaluateRealLlmGate(summary, cleanEvaluation, { requireReal: true, maxFallbackPercentage: 100 });
    expect(gate.ok).toBe(false);
    expect(gate.reasons.some(reason => reason.includes("JSON invalido"))).toBe(true);
  });

  it("proveedor solicitado Gemini pero algun turno respondio via OpenAI - falla (mismatch de proveedor)", () => {
    const summary = summarizeLlmObservations(
      [
        { runtime: "gemini", model: "gemini-3.1-flash-lite" },
        { runtime: "openai", model: "gpt-5.6-terra" }
      ],
      baseInput
    );
    const gate = evaluateRealLlmGate(summary, cleanEvaluation, { requireReal: true, maxFallbackPercentage: 0 });
    expect(gate.ok).toBe(false);
    expect(gate.reasons.some(reason => reason.includes("Proveedor solicitado era Gemini"))).toBe(true);
  });

  it("fallos criticos en la evaluacion bloquean el veredicto aunque el runtime sea 100% real", () => {
    const summary = summarizeLlmObservations([{ runtime: "gemini", model: "gemini-3.1-flash-lite" }], baseInput);
    const gate = evaluateRealLlmGate(summary, { criticalFailures: 1, conversations: [] }, { requireReal: true, maxFallbackPercentage: 0 });
    expect(gate.ok).toBe(false);
  });

  it("ejecucion limpia y 100% real pasa la puerta", () => {
    const summary = summarizeLlmObservations([{ runtime: "gemini", model: "gemini-3.1-flash-lite" }], baseInput);
    const gate = evaluateRealLlmGate(summary, cleanEvaluation, { requireReal: true, maxFallbackPercentage: 0 });
    expect(gate.ok).toBe(true);
  });
});
