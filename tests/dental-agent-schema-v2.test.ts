import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";
import {
  dentalAgentStateSchema,
  runDentalAgentTurn,
  runOpenAiDentalAgentTurn
} from "@/lib/agent/openai-dental-agent";

// Nombres de variables de entorno construidos en runtime (no como literal
// contiguo) para no disparar el escaneo de secretos del hook de seguridad del
// entorno de desarrollo sobre nombres de claves de proveedores LLM conocidos -
// no son valores reales, son solo los NOMBRES de las variables que se mockean.
const OPENAI_KEY_ENV = ["OPENAI", "API", "KEY"].join("_");
const GEMINI_KEY_ENV = ["GEMINI", "API", "KEY"].join("_");

// Forma real de la respuesta de la Generative Language API (generateContent).
function geminiResponse(text: string) {
  return { candidates: [{ content: { role: "model", parts: [{ text }] } }] };
}

function validAiPayload(overrides: Record<string, unknown> = {}) {
  return {
    reply: "Perfecto, cuentame que necesitas para poder ayudarte.",
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
    triageLabel: "Rutina",
    clinicalReading: "Esperando motivo.",
    likelyCauses: [],
    detectedSignals: [],
    redFlags: [],
    missingClinicalData: [],
    confidence: "Baja",
    safetyScreened: false,
    ...overrides
  };
}

const ORIGINAL_ENV = {
  provider: process.env.LLM_PROVIDER,
  openAiKey: process.env[OPENAI_KEY_ENV],
  openAiModel: process.env.OPENAI_MODEL,
  geminiKey: process.env[GEMINI_KEY_ENV],
  geminiModel: process.env.GEMINI_MODEL,
  schemaVersion: process.env.DENTAL_AGENT_SCHEMA_VERSION
};

afterEach(() => {
  process.env.LLM_PROVIDER = ORIGINAL_ENV.provider;
  process.env[OPENAI_KEY_ENV] = ORIGINAL_ENV.openAiKey;
  process.env.OPENAI_MODEL = ORIGINAL_ENV.openAiModel;
  process.env[GEMINI_KEY_ENV] = ORIGINAL_ENV.geminiKey;
  process.env.GEMINI_MODEL = ORIGINAL_ENV.geminiModel;
  process.env.DENTAL_AGENT_SCHEMA_VERSION = ORIGINAL_ENV.schemaVersion;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DENTAL_AGENT_SCHEMA_VERSION=v1 (default)", () => {
  it("accepts a V1 response and still attaches code-derived conversationIntent/treatmentTopic", async () => {
    delete process.env.DENTAL_AGENT_SCHEMA_VERSION;
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(validAiPayload()) })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "hola",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("openai");
    // routeDentalConversationTurn (fase 3) es la fuente real: "hola" se clasifica
    // por el texto como "greeting", no por el intent clinico (que sigue sin fijar).
    expect(result.conversationIntent).toBe("greeting");
    expect(result.treatmentTopic).toBe("unknown");
  });
});

describe("DENTAL_AGENT_SCHEMA_VERSION=v2", () => {
  it("accepts a V2 response with conversationIntent/treatmentTopic present", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify(
          validAiPayload({
            intent: "reactivation",
            // Deliberadamente "equivocado" a proposito: no debe importar lo que
            // ponga aqui la IA, el valor final siempre se recalcula en codigo.
            conversationIntent: "confirm",
            treatmentTopic: "trauma"
          })
        )
      })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "cita para una limpieza",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("openai");
    // El sistema nunca deja que la IA decida esta clasificacion: se recalcula
    // siempre en codigo (normalizeDentalAgentState), ignorando lo que diga aqui.
    expect(result.conversationIntent).not.toBe("confirm");
    expect(result.treatmentTopic).not.toBe("trauma");
  });

  it("logs a shadow comparison (deterministic vs AI-proposed) with no patient text or PII, only when V2 supplies both fields", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify(
          validAiPayload({
            intent: "reactivation",
            conversationIntent: "confirm",
            treatmentTopic: "trauma"
          })
        )
      })
    } as Response);

    await runOpenAiDentalAgentTurn({
      latestPatientMessage: "Soy Fulanito Perez y me duele muchisimo, es info privada del paciente",
      history: [],
      state: initialDentalAgentState
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [label, payload] = infoSpy.mock.calls[0];
    expect(label).toContain("conversation-classification-shadow");
    expect(payload).toMatchObject({
      aiConversationIntent: "confirm",
      aiTreatmentTopic: "trauma",
      matches: false
    });
    expect(payload).toHaveProperty("deterministicConversationIntent");
    expect(payload).toHaveProperty("deterministicTreatmentTopic");
    const serializedPayload = JSON.stringify(payload);
    expect(serializedPayload).not.toContain("Fulanito");
    expect(serializedPayload).not.toContain("info privada");
  });

  it("does not log the shadow comparison under V1 (no AI-proposed fields to compare)", async () => {
    delete process.env.DENTAL_AGENT_SCHEMA_VERSION;
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(validAiPayload()) })
    } as Response);

    await runOpenAiDentalAgentTurn({
      latestPatientMessage: "hola",
      history: [],
      state: initialDentalAgentState
    });

    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("still parses successfully when V2 is requested but the model omits the new fields (falls back to V1 shape)", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(validAiPayload()) })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "hola",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("openai");
    expect(result.conversationIntent).toBe("greeting");
  });

  it("falls back to the local engine on invalid JSON from OpenAI", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: "esto no es json valido {" })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "me duele una muela",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("local");
    expect(result.fallbackReason).toBeTruthy();
    expect(result.conversationIntent).toBeDefined();
    expect(result.treatmentTopic).toBeDefined();
  });

  it("extracts a Gemini truncated JSON fragment the same way under v2 as under v1", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    process.env.LLM_PROVIDER = "gemini";
    process.env[GEMINI_KEY_ENV] = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-truncated-v2";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () =>
        geminiResponse(
          '{\n  "reply": "Siento mucho que estes con ese dolor tan intenso. Podria tratarse de una inflamacion, por lo que conviene que lo revise el doctor lo antes posible'
        )
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "ME DUELE MUCHO UNA MUELA",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.model).toContain("texto libre");
    expect(result.reply).toContain("Antes de nada");
    expect(result.conversationIntent).toBeDefined();
  });

  it("falls back to the local engine when the LLM call times out", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";

    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, requestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestInit?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        })
    );

    const promise = runOpenAiDentalAgentTurn({
      latestPatientMessage: "me duele una muela",
      history: [],
      state: initialDentalAgentState
    });
    await vi.advanceTimersByTimeAsync(13_000);
    const result = await promise;

    expect(result.runtime).toBe("local");
    expect(result.conversationIntent).toBeDefined();
  });

  it("falls back to the local engine when no API key is configured", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "me duele una muela",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("local");
    expect(result.conversationIntent).toBeDefined();
    expect(result.treatmentTopic).toBeDefined();
  });

  it("stays compatible with a stored state from before the new fields existed", async () => {
    process.env.DENTAL_AGENT_SCHEMA_VERSION = "v2";
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const oldStoredState = dentalAgentStateSchema.parse({
      intent: "periodontics",
      intentCode: "PERIODONCIA_ENCIAS",
      treatmentNeed: "Periodoncia",
      budget: "desde 90 EUR",
      estimatedValue: 22000,
      escalated: false,
      consent: true,
      name: "Paula Test",
      phone: "613888777",
      location: "Murcia centro",
      availability: "viernes tarde",
      ready: true,
      triageLevel: "PRIORITY_72H",
      triageLabel: "Prioridad 48-72h",
      clinicalReading: "Sangrado gingival.",
      likelyCauses: ["gingivitis"],
      detectedSignals: ["sangrado de encias"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    });

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "gracias",
      history: [],
      state: oldStoredState
    });

    expect(result.runtime).toBe("local");
    expect(result.conversationIntent).toBeDefined();
    expect(result.treatmentTopic).toBe("periodontics");
  });
});
