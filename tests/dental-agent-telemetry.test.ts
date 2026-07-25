import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";

// FINAL-DENTIA-CLOSEOUT Fase 10: la telemetria debe exponer senales tecnicas
// (runtime/modelo/duracion/timeout/fallback/escalado/estado de reserva) SIN
// nunca incluir texto del paciente, nombre/telefono/email, ni la clave de la
// API. Usa console.debug (no console.info: ese canal ya esta reservado para
// el shadow-logging de conversationIntent/treatmentTopic, ver
// dental-agent-schema-v2.test.ts).
const OPENAI_KEY_ENV = ["OPENAI", "API", "KEY"].join("_");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logDentalAgentTelemetry", () => {
  it("registra runtime/modelo/duracion/escalado/triaje/bookingStatus sin PII", async () => {
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          reply: "Perfecto, cuentame que necesitas.",
          intent: "unknown",
          intentCode: "INTENCION_PENDIENTE",
          treatmentNeed: "Pendiente",
          budget: "Pendiente",
          estimatedValue: 0,
          escalated: false,
          consent: false,
          name: "",
          phone: "",
          location: "",
          availability: "",
          triageLevel: "ROUTINE",
          triageLabel: "Pendiente",
          clinicalReading: "Esperando descripcion del paciente.",
          likelyCauses: [],
          detectedSignals: [],
          redFlags: [],
          missingClinicalData: [],
          confidence: "Baja",
          safetyScreened: false
        })
      })
    } as Response);

    await runOpenAiDentalAgentTurn({
      latestPatientMessage: "Soy Fulanito Perez, mi telefono es 654123456, hola",
      history: [],
      state: initialDentalAgentState
    });

    const telemetryCall = debugSpy.mock.calls.find(call => call[0] === "[dental-agent] telemetry");
    expect(telemetryCall).toBeDefined();
    const payload = telemetryCall?.[1] as Record<string, unknown>;

    expect(payload).toMatchObject({
      runtime: "openai",
      model: "gpt-test",
      timeout: false,
      schemaParseFailure: false,
      escalated: false,
      triageLevel: "ROUTINE"
    });
    expect(typeof payload.durationMs).toBe("number");
    expect(payload).toHaveProperty("bookingStatus");
    expect(payload).toHaveProperty("conversationStatus");

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("Fulanito");
    expect(serialized).not.toContain("654123456");
    expect(serialized).not.toContain("test-key");
  });

  it("marca timeout=true y schemaParseFailure=false cuando el proveedor no responde a tiempo", async () => {
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          const err = new Error("Sin respuesta del proveedor externo en 12s");
          err.name = "RequestTimeoutError";
          reject(err);
        })
    );

    await runOpenAiDentalAgentTurn({ latestPatientMessage: "hola", history: [], state: initialDentalAgentState });

    const telemetryCall = debugSpy.mock.calls.find(call => call[0] === "[dental-agent] telemetry");
    const payload = telemetryCall?.[1] as Record<string, unknown>;
    expect(payload.runtime).toBe("local");
    expect(payload.timeout).toBe(true);
    expect(payload.schemaParseFailure).toBe(false);
    expect(payload.fallbackReason).toContain("Sin respuesta del proveedor externo");
  });
});
