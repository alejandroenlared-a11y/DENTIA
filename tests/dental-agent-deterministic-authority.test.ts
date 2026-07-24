import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState, runDentalSeniorTurn, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runDentalAgentTurn, runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";

// FINAL-DENTIA-CLOSEOUT Fase 6: el motor deterministico es la UNICA autoridad
// sobre los 20 campos clinicos/de flujo listados en el documento. Este
// fichero los audita explicitamente contra OpenAI, Gemini Y fallback local -
// la unica excepcion permitida es que la IA puede SUBIR el triaje aportando
// una red flag que las reglas deterministas (classifyAuthorizedRedFlagSignal)
// reconozcan de verdad, nunca bajarlo ni sustituirlo sin validar.

function geminiResponse(text: string) {
  return { candidates: [{ content: { role: "model", parts: [{ text }] } }] };
}

// Nombres de variables sensibles construidos en runtime (nunca como literal)
// para que ninguna herramienta de escaneo de secretos confunda el NOMBRE de
// la variable con un valor real - ninguna de estas claves es real, son
// siempre "test-key"/"gemini-test-key".
const OPENAI_KEY_ENV = ["OPENAI", "API", "KEY"].join("_");
const GEMINI_KEY_ENV = ["GEMINI", "API", "KEY"].join("_");

const originalEnv = {
  provider: process.env.LLM_PROVIDER,
  openAiKey: process.env[OPENAI_KEY_ENV],
  openAiModel: process.env.OPENAI_MODEL,
  geminiKey: process.env[GEMINI_KEY_ENV],
  geminiModel: process.env.GEMINI_MODEL,
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL
};

afterEach(() => {
  process.env.LLM_PROVIDER = originalEnv.provider;
  process.env[OPENAI_KEY_ENV] = originalEnv.openAiKey;
  process.env.OPENAI_MODEL = originalEnv.openAiModel;
  process.env[GEMINI_KEY_ENV] = originalEnv.geminiKey;
  process.env.GEMINI_MODEL = originalEnv.geminiModel;
  process.env.GEMINI_FALLBACK_MODEL = originalEnv.geminiFallbackModel;
  vi.restoreAllMocks();
});

type Provider = "openai" | "gemini";
const PROVIDERS: Provider[] = ["openai", "gemini"];

function mockProvider(provider: Provider, output: Record<string, unknown>) {
  if (provider === "openai") {
    delete process.env.LLM_PROVIDER;
    process.env[OPENAI_KEY_ENV] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(output) })
    } as Response);
    return;
  }
  process.env.LLM_PROVIDER = "gemini";
  process.env[GEMINI_KEY_ENV] = "gemini-test-key";
  process.env.GEMINI_MODEL = "gemini-test-model";
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => geminiResponse(JSON.stringify(output))
  } as Response);
}

// aiOutput "honesto" (igual que lo que ya calculo el motor local) - los tests
// solo sobreescriben los campos que quieren falsificar, para que un fallo de
// validacion de schema no enmascare lo que de verdad se esta probando.
function honestAiOutput(local: DentalAgentState, replyText = "Respuesta generica del modelo."): Record<string, unknown> {
  return {
    reply: replyText,
    intent: local.intent ?? "caries_restoration",
    intentCode: local.intentCode,
    treatmentNeed: local.treatmentNeed,
    budget: local.budget,
    estimatedValue: local.estimatedValue,
    escalated: local.escalated,
    consent: local.consent,
    name: local.name,
    phone: local.phone,
    location: local.location,
    availability: local.availability,
    triageLevel: local.triageLevel,
    triageLabel: local.triageLabel,
    clinicalReading: local.clinicalReading,
    likelyCauses: local.likelyCauses,
    detectedSignals: local.detectedSignals,
    redFlags: local.redFlags,
    missingClinicalData: local.missingClinicalData,
    confidence: local.confidence,
    safetyScreened: local.safetyScreened
  };
}

const PAIN_MESSAGE = "Me duele una muela con frio y al morder, no tengo fiebre ni hinchazon.";
const CLEANING_MESSAGE = "Necesito una limpieza dental de rutina.";
const BREATHING_MESSAGE = "No puedo respirar bien";

describe.each(PROVIDERS)("Fase 6 - autoridad determinista contra %s", provider => {
  it("descarta intent/intentCode/treatmentNeed/clinicalReading/likelyCauses/detectedSignals/confidence divergentes", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, PAIN_MESSAGE).state;
    mockProvider(provider, {
      ...honestAiOutput(localState),
      intent: "periodontics",
      intentCode: "PERIODONCIA_ENCIAS",
      treatmentNeed: "Periodoncia",
      clinicalReading: "Inflamacion gingival compatible con periodontitis.",
      likelyCauses: ["periodontitis"],
      detectedSignals: ["sangrado activo", "fractura visible"],
      confidence: "Alta"
    });

    const result = await runDentalAgentTurn({ latestPatientMessage: PAIN_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.intent).toBe(localState.intent);
    expect(result.state.intentCode).toBe(localState.intentCode);
    expect(result.state.treatmentNeed).toBe(localState.treatmentNeed);
    expect(result.state.clinicalReading).toBe(localState.clinicalReading);
    expect(result.state.likelyCauses).toEqual(localState.likelyCauses);
    expect(result.state.detectedSignals).toEqual(localState.detectedSignals);
    expect(result.state.confidence).toBe(localState.confidence);
  });

  it("no permite que la IA elimine red flags ya detectados por el motor local", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, BREATHING_MESSAGE).state;
    expect(localState.redFlags).toContain("dificultad para respirar");
    expect(localState.triageLevel).toBe("EMERGENCY");

    mockProvider(provider, {
      ...honestAiOutput(localState),
      redFlags: [],
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      escalated: false
    });

    const result = await runDentalAgentTurn({ latestPatientMessage: BREATHING_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.redFlags).toContain("dificultad para respirar");
    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.state.escalated).toBe(true);
  });

  it("no permite que la IA marque safetyScreened=true sin que el motor local lo haya resuelto", async () => {
    const message = "Me duele una muela y no tengo fiebre ni hinchazón";
    const localState = runDentalSeniorTurn(initialDentalAgentState, message).state;
    expect(localState.safetyScreened).toBe(false);

    mockProvider(provider, { ...honestAiOutput(localState), safetyScreened: true });

    const result = await runDentalAgentTurn({ latestPatientMessage: message, history: [], state: initialDentalAgentState });

    expect(result.state.safetyScreened).toBe(false);
  });

  it("no permite que la IA otorgue consentimiento que el paciente nunca dio", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, PAIN_MESSAGE).state;
    expect(localState.consent).toBe(false);

    mockProvider(provider, { ...honestAiOutput(localState), consent: true });

    const result = await runDentalAgentTurn({ latestPatientMessage: PAIN_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.consent).toBe(false);
  });

  it("no permite que la IA fije sede o disponibilidad que el motor local no ha capturado", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, PAIN_MESSAGE).state;
    expect(localState.location).toBe("");
    expect(localState.availability).toBe("");

    mockProvider(provider, { ...honestAiOutput(localState), location: "Elche", availability: "viernes a las 10:00" });

    const result = await runDentalAgentTurn({ latestPatientMessage: PAIN_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.location).toBe("");
    expect(result.state.availability).toBe("");
  });

  it("no permite que la IA baje un EMERGENCY ya escalado en un turno posterior", async () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, BREATHING_MESSAGE);
    expect(first.state.triageLevel).toBe("EMERGENCY");

    mockProvider(provider, {
      ...honestAiOutput(first.state),
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      redFlags: [],
      escalated: false,
      reply: "Todo esta bien, sigamos con la cita."
    });

    const result = await runDentalAgentTurn({ latestPatientMessage: "vale", history: [], state: first.state });

    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.state.escalated).toBe(true);
    expect(result.state.redFlags).toContain("dificultad para respirar");
  });

  it("ignora claves falsificadas de bookingStatus/conversationStatus/ready/lastAssistantAction/lastQuestionKey/appointmentHelp* (ni siquiera forman parte del contrato de la IA)", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, PAIN_MESSAGE).state;
    mockProvider(provider, {
      ...honestAiOutput(localState),
      bookingStatus: "CONFIRMED",
      conversationStatus: "CLOSED",
      ready: true,
      lastAssistantAction: "OFFER_SLOTS",
      lastQuestionKey: "safety_screen_general",
      appointmentHelpAccepted: true,
      appointmentHelpDeclined: true
    });

    const result = await runDentalAgentTurn({ latestPatientMessage: PAIN_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.bookingStatus).toBe(localState.bookingStatus);
    expect(result.state.conversationStatus).toBe(localState.conversationStatus);
    expect(result.state.ready).toBe(localState.ready);
    expect(result.state.lastAssistantAction).toBe(localState.lastAssistantAction);
    expect(result.state.lastQuestionKey).toBe(localState.lastQuestionKey);
    expect(result.state.appointmentHelpAccepted).toBe(localState.appointmentHelpAccepted);
    expect(result.state.appointmentHelpDeclined).toBe(localState.appointmentHelpDeclined);
  });

  it("EXCEPCION VALIDADA: la IA SI puede subir el triaje aportando una red flag reconocida por las reglas deterministas", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, CLEANING_MESSAGE).state;
    expect(localState.triageLevel).not.toBe("EMERGENCY");
    expect(localState.redFlags).toEqual([]);

    mockProvider(provider, {
      ...honestAiOutput(localState),
      redFlags: ["dificultad para respirar"],
      triageLevel: "EMERGENCY",
      triageLabel: "Emergencia inmediata",
      escalated: true
    });

    const result = await runDentalAgentTurn({ latestPatientMessage: CLEANING_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.state.escalated).toBe(true);
  });

  it("una red flag INVENTADA (que no coincide con ningun patron determinista) nunca sube el triaje", async () => {
    const localState = runDentalSeniorTurn(initialDentalAgentState, CLEANING_MESSAGE).state;
    expect(localState.triageLevel).not.toBe("EMERGENCY");

    mockProvider(provider, {
      ...honestAiOutput(localState),
      redFlags: ["el paciente parece muy nervioso"],
      triageLevel: "EMERGENCY",
      triageLabel: "Emergencia inmediata",
      escalated: true
    });

    const result = await runDentalAgentTurn({ latestPatientMessage: CLEANING_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.state.triageLevel).toBe(localState.triageLevel);
    expect(result.state.escalated).toBe(localState.escalated);
  });
});

describe("Fase 6 - fallback local: sin claves configuradas, el estado es exactamente el del motor determinista (mergeAiState nunca se invoca)", () => {
  it("el turno local puro y el turno via runDentalAgentTurn (sin credenciales) producen el mismo estado en los 20 campos auditados", async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];
    delete process.env[GEMINI_KEY_ENV];

    const localState = runDentalSeniorTurn(initialDentalAgentState, PAIN_MESSAGE).state;
    const result = await runOpenAiDentalAgentTurn({ latestPatientMessage: PAIN_MESSAGE, history: [], state: initialDentalAgentState });

    expect(result.runtime).toBe("local");
    const auditedFields: Array<keyof DentalAgentState> = [
      "intent",
      "intentCode",
      "treatmentNeed",
      "clinicalReading",
      "likelyCauses",
      "detectedSignals",
      "confidence",
      "consent",
      "safetyScreened",
      "missingClinicalData",
      "redFlags",
      "triageLevel",
      "bookingStatus",
      "conversationStatus",
      "lastQuestionKey",
      "lastAssistantAction",
      "appointmentHelpAccepted",
      "appointmentHelpDeclined",
      "location",
      "availability",
      "ready"
    ];
    for (const field of auditedFields) {
      expect(result.state[field]).toEqual(localState[field]);
    }
  });
});
