import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runDentalAgentTurn, runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";

// Forma real de la respuesta de la Generative Language API (generateContent).
function geminiResponse(text: string) {
  return { candidates: [{ content: { role: "model", parts: [{ text }] } }] };
}

const originalProvider = process.env.LLM_PROVIDER;
const originalOpenAiApiKey = process.env.OPENAI_API_KEY;
const originalOpenAiModel = process.env.OPENAI_MODEL;
const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalGeminiFallbackModel = process.env.GEMINI_FALLBACK_MODEL;

afterEach(() => {
  process.env.LLM_PROVIDER = originalProvider;
  process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  process.env.OPENAI_MODEL = originalOpenAiModel;
  process.env.GEMINI_API_KEY = originalGeminiApiKey;
  process.env.GEMINI_MODEL = originalGeminiModel;
  process.env.GEMINI_FALLBACK_MODEL = originalGeminiFallbackModel;
  vi.restoreAllMocks();
});

describe("runDentalAgentTurn", () => {
  it("answers address questions directly when Gemini tries to open symptom triage", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Te leo. Cuentame un poco mas: es dolor, encias, una pieza rota, implante, ortodoncia, estetica o una revision?",
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
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "donde teneis vuestra clinica de Elche??",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.reply).toContain("Carrer Reina Victoria, 49");
    expect(result.reply.toLowerCase()).not.toContain("dolor, encias");
    expect(result.reply.toLowerCase()).not.toContain("pieza rota");
  });

  it("does not mention private clinic unless the patient asks", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "La clinica de Elche esta en Carrer Reina Victoria, 49. Somos una clinica privada.",
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
      clinicalReading: "Consulta de ubicacion.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Baja",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "donde teneis vuestra clinica de Elche??",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.reply).toContain("Carrer Reina Victoria, 49");
    expect(result.reply.toLowerCase()).not.toContain("privada");
  });

  it("answers team and specialty questions when Gemini tries generic triage", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Te leo. Cuentame un poco mas: es dolor, encias, una pieza rota, implante, ortodoncia, estetica o una revision?",
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
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "que doctores y especialidades teneis?",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.reply).toContain("Dr. Ernesto Ruiz Chumilla");
    expect(result.reply).toContain("Dra. Esther Estrada Mallada");
    expect(result.reply).toContain("Dr. Manuel Ruiz Chumilla");
    expect(result.reply).toContain("cita con algun doctor en concreto");
    expect(result.reply.toLowerCase()).not.toContain("dolor, encias");
    expect(result.reply.toLowerCase()).not.toContain("pieza rota");
  });

  it("falls back to the local dental engine when OPENAI_API_KEY is missing", async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "Me duele una muela con frio y al morder, no tengo fiebre ni hinchazon.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("local");
    expect(result.fallbackReason).toContain("OPENAI_API_KEY");
    expect(result.state.intent).toBe("caries_restoration");
    expect(result.reply).toContain("empaste");
  });

  it("uses a valid structured OpenAI response and keeps CRM-ready state", async () => {
    delete process.env.LLM_PROVIDER;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const output = {
      reply:
        "Por lo que cuentas, parece una consulta de encias que conviene revisar con prioridad. Te dejo una pre-reserva en Murcia el viernes por la tarde y el doctor confirmara el plan.",
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
      triageLevel: "PRIORITY_72H",
      triageLabel: "Prioridad 48-72h",
      clinicalReading: "Sangrado gingival y mal aliento compatible con inflamacion periodontal a valorar.",
      likelyCauses: ["gingivitis", "periodontitis"],
      detectedSignals: ["sangrado de encias"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(output) })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage:
        "Me sangran las encias. Acepto que guardes mis datos. Soy Paula Test, telefono 613888777, email paula@example.com. Prefiero Murcia el viernes por la tarde.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("openai");
    expect(result.model).toBe("gpt-test");
    expect(result.reply).toContain("pre-reserva");
    expect(result.state.ready).toBe(true);
    expect(result.state.intent).toBe("periodontics");
    expect(result.state.budget).toBe("desde 90 EUR");
  });

  it("does not let the LLM promise a specific provider before scheduling confirms it", async () => {
    delete process.env.LLM_PROVIDER;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const state = {
      ...initialDentalAgentState,
      intent: "periodontics" as const,
      intentCode: "PERIODONCIA_ENCIAS",
      treatmentNeed: "Periodoncia",
      budget: "desde 90 EUR",
      estimatedValue: 22000,
      consent: true,
      name: "Susana Test",
      phone: "612111333",
      email: "susana@example.com",
      clinicalReading: "Sangrado de encias a valorar.",
      likelyCauses: ["gingivitis", "periodontitis"],
      detectedSignals: ["sangrado de encias"],
      safetyScreened: true
    };

    const output = {
      reply:
        "Para poder citarte con el Dr. Ernesto Ruiz, nuestro especialista en periodoncia, prefieres que te atendamos en Murcia o Elche?",
      intent: "periodontics",
      intentCode: "PERIODONCIA_ENCIAS",
      treatmentNeed: "Periodoncia",
      budget: "desde 90 EUR",
      estimatedValue: 22000,
      escalated: false,
      consent: true,
      name: "Susana Test",
      phone: "612111333",
      location: "Murcia centro",
      availability: "",
      triageLevel: "PRIORITY_72H",
      triageLabel: "Prioridad 48-72h",
      clinicalReading: "Sangrado de encias a valorar.",
      likelyCauses: ["gingivitis", "periodontitis"],
      detectedSignals: ["sangrado de encias"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(output) })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "Murcia",
      history: [],
      state
    });

    expect(result.reply).not.toContain("Dr. Ernesto");
    expect(result.reply).not.toContain("especialista");
    expect(result.reply).toContain("Te puedo proponer estos huecos");
    expect(result.reply).toContain("1.");
    expect(result.reply).toContain("Responde con 1, 2 o 3");
  });

  it("uses Gemini when LLM_PROVIDER=gemini", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Por lo que cuentas, encaja con una consulta de primera visita para revisar esa molestia y te puedo dejar una propuesta en Elche el viernes por la manana.",
      intent: "first_visit",
      intentCode: "CITA_PRIMERA_VISITA",
      treatmentNeed: "Primera visita",
      budget: "0 EUR",
      estimatedValue: 0,
      escalated: false,
      consent: true,
      name: "Lucia Test",
      phone: "611000999",
      location: "Elche - Altabix",
      availability: "viernes manana",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Molestia leve sin banderas rojas, compatible con revision programable.",
      likelyCauses: ["revision general"],
      detectedSignals: ["sensibilidad leve"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(`\`\`\`json\n${JSON.stringify(output)}\n\`\`\``)
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage:
        "Acepto que guardes mis datos. Soy Lucia Test, telefono 611000999, email lucia@example.com y prefiero Elche el viernes por la manana. Quiero una revision.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.model).toBe("gemini-test-model");
    expect(result.reply).toContain("Elche");
    expect(result.state.ready).toBe(true);
    expect(result.state.intent).toBe("first_visit");
    expect(result.state.location).toBe("Elche - Altabix");
  });

  it("does not let Gemini ask for contact data before consent", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Lamento que tengas esa molestia al morder y con el frio.\n\nPara poder ayudarte, me podrias indicar tu nombre y si prefieres Murcia o Elche?",
      intent: "caries_restoration",
      intentCode: "CARIES_RESTAURACION",
      treatmentNeed: "Empaste / conservadora",
      budget: "desde 65 EUR",
      estimatedValue: 11000,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "PRIORITY_72H",
      triageLabel: "Prioridad 48-72h",
      clinicalReading: "Dolor al morder y sensibilidad al frio compatible con valoracion conservadora.",
      likelyCauses: ["caries", "filtracion de empaste"],
      detectedSignals: ["dolor al morder", "sensibilidad al frio/calor"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Me duele una muela al morder y con el frio. No tengo fiebre ni hinchazon.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    // Hotfix dental-negation-context (Problema 1): tras el cribado, Clara
    // ofrece ayuda con la cita ANTES de pedir consentimiento - nunca pide
    // datos de contacto directamente en este turno.
    expect(result.reply).toContain("Quieres que te ayude a solicitar una cita");
    expect(result.reply).not.toContain("Aceptas que guardemos tus datos");
    expect(result.reply.toLowerCase()).not.toContain("me podrias indicar tu nombre");
    expect(result.reply.toLowerCase()).not.toContain("murcia o elche");
  });

  it("does not let Gemini ask consent before safety triage for a moving tooth", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Por lo que me cuentas podria ser gingivitis o periodontitis; te lo confirmara el doctor al verte.\n\nTe dejo la cita preparada si te va bien. Aceptas que guardemos tus datos para gestionarla?",
      intent: "periodontics",
      intentCode: "PERIODONCIA_ENCIAS",
      treatmentNeed: "Periodoncia",
      budget: "desde 90 EUR",
      estimatedValue: 22000,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "PRIORITY_72H",
      triageLabel: "Prioridad 48-72h",
      clinicalReading: "Movilidad dental a valorar.",
      likelyCauses: ["gingivitis", "periodontitis"],
      detectedSignals: ["movilidad dental"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "se me mueve una muela",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.state.intent).toBe("periodontics");
    expect(result.reply).toContain("Te duele, notas inflamación, sangrado o ha sido por un golpe?");
    expect(result.reply.toLowerCase()).not.toContain("gingivitis");
    expect(result.reply.toLowerCase()).not.toContain("periodontitis");
    expect(result.reply.toLowerCase()).not.toContain("aceptas que guardemos");
  });

  it("does not let Gemini use awkward trauma wording", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Desde cuando ocurrio el golpe y que intensidad de dolor sientes del 0 al 10? Tambien necesito saber si tienes dificultad para abrir la boca o tragar.",
      intent: "trauma",
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Traumatismo dental a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Me he dado un golpe en una muela y se mueve",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.state.intent).toBe("trauma");
    expect(result.reply).toContain("Cuando te diste el golpe");
    expect(result.reply).toContain("Puedes abrir la boca y tragar bien");
    expect(result.reply.toLowerCase()).not.toContain("desde cuando ocurrio el golpe");
  });

  it("does not let Gemini switch trauma follow-up to pulpitis or cold heat protocol", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "trauma" as const,
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      triageLevel: "URGENT_24H" as const,
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: false
    };

    const output = {
      reply:
        "Vale, vamos con calma. Por lo que me cuentas podria ser pulpitis o absceso dental; te lo confirmara el doctor al verte.\n\nEl dolor aparece con frio/calor, al morder o aparece solo sin tocar la pieza?",
      intent: "urgent_pain",
      intentCode: "TRIAJE_DOLOR_INFECCION",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 22000,
      escalated: true,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Dolor intenso compatible con infeccion.",
      likelyCauses: ["pulpitis", "absceso dental"],
      detectedSignals: ["dolor intenso"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "ayer y me duele un 7. si puedo tragar",
      history: [
        { role: "patient", body: "Me he dado un golpe en una muela y se mueve" },
        {
          role: "assistant",
          body: "Cuando te diste el golpe y cuanto te duele del 0 al 10? Puedes abrir la boca y tragar bien?"
        }
      ],
      state
    });

    expect(result.runtime).toBe("gemini");
    expect(result.state.intent).toBe("trauma");
    expect(result.reply).toContain("Y puedes abrir la boca bien?");
    expect(result.reply.toLowerCase()).not.toContain("pulpitis");
    expect(result.reply.toLowerCase()).not.toContain("absceso");
    expect(result.reply.toLowerCase()).not.toContain("frio/calor");
  });

  it("does not let Gemini lose context after a one-word symptom answer", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "periodontics" as const,
      intentCode: "PERIODONCIA_ENCIAS",
      treatmentNeed: "Periodoncia",
      budget: "desde 90 EUR",
      estimatedValue: 22000,
      triageLevel: "PRIORITY_72H" as const,
      triageLabel: "Prioridad 48-72h",
      clinicalReading: "Movilidad dental compatible con valoracion periodontal.",
      likelyCauses: ["gingivitis", "periodontitis"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: false
    };

    const output = {
      reply:
        "Te leo. Cuentame un poco mas: es dolor, encias, una pieza rota, implante, ortodoncia, estetica o una revision?",
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
      clinicalReading: "Esperando motivo de consulta.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Baja",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "sangrado",
      history: [
        { role: "patient", body: "se me mueve una muela" },
        {
          role: "assistant",
          body: "Para poder ayudarte, tienes algun otro sintoma como dolor, inflamacion o sangrado en la zona?"
        }
      ],
      state
    });

    expect(result.runtime).toBe("gemini");
    expect(result.state.intent).toBe("periodontics");
    expect(result.state.detectedSignals).toContain("sangrado de encias");
    expect(result.reply).toContain("El sangrado es leve o abundante");
    expect(result.reply.toLowerCase()).not.toContain("pieza rota");
    expect(result.reply.toLowerCase()).not.toContain("implante, ortodoncia");
  });

  it("keeps aesthetic options direct when Gemini tries to push booking too early", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intentCode: "PRESUPUESTO_PENDIENTE"
    };
    const output = {
      reply:
        "Para estetica ofrecemos blanqueamiento, carillas y diseno digital de sonrisa.\n\nTe gustaria registrar tus datos para darte una cita? Necesito tu consentimiento para guardar tu informacion.",
      intent: "cosmetic_dentistry",
      intentCode: "ESTETICA_DENTAL_VALORACION",
      treatmentNeed: "Estetica dental",
      budget: "valoracion sin coste",
      estimatedValue: 85000,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "ESTHETIC",
      triageLabel: "Estetica programable",
      clinicalReading: "Opciones de estetica dental.",
      likelyCauses: ["mejora de sonrisa"],
      detectedSignals: ["estetica"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "estetica, que opciones tienes?",
      history: [],
      state
    });

    expect(result.runtime).toBe("gemini");
    expect(result.reply).toContain("Tenemos varias opciones");
    expect(result.reply).toContain("Cual te interesa mas?");
    expect(result.reply.toLowerCase()).not.toContain("consentimiento");
    expect(result.reply.toLowerCase()).not.toContain("guardar");
    expect(result.reply.toLowerCase()).not.toContain("cita");
  });

  it("does not repeat Clara identity after a simple greeting", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Hola, soy Clara, la asistente de inteligencia artificial de la Clinica Dental Murcia-Elche. Estare encantada de ayudarte hoy.\n\nPara poder orientarte, cuentame que necesitas.",
      intent: "unknown",
      intentCode: "INTENCION_PENDIENTE",
      treatmentNeed: "",
      budget: "",
      estimatedValue: 0,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Esperando motivo de consulta.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: ["Motivo de consulta"],
      confidence: "Baja",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "hola",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.reply).toBe("Hola.\n\nPara poder orientarte, cuentame qué necesitas o qué te preocupa.");
    expect(result.reply.toLowerCase()).not.toContain("soy clara");
    expect(result.reply.toLowerCase()).not.toContain("inteligencia artificial");
  });

  it("asks only for location before asking for schedule preferences", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "implant_price" as const,
      intentCode: "IMPLANTE_VALORACION",
      treatmentNeed: "Implante dental",
      budget: "desde 1.200 EUR",
      estimatedValue: 180000,
      consent: true,
      name: "Alex Demo",
      phone: "600111222",
      email: "alex@example.com",
      triageLevel: "ROUTINE" as const,
      triageLabel: "Rutina",
      clinicalReading: "Valoracion programable de implante.",
      likelyCauses: ["pieza ausente"],
      detectedSignals: ["pieza ausente"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const output = {
      reply:
        "Muchas gracias, Alex. Preferirias acudir a nuestra clinica de Murcia o a la de Elche?\n\nAdemas, que disponibilidad sueles tener para buscarte un hueco?",
      intent: "implant_price",
      intentCode: "IMPLANTE_VALORACION",
      treatmentNeed: "Implante dental",
      budget: "desde 1.200 EUR",
      estimatedValue: 180000,
      escalated: false,
      consent: true,
      name: "Alex Demo",
      phone: "600111222",
      location: "",
      availability: "",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Valoracion programable de implante.",
      likelyCauses: ["pieza ausente"],
      detectedSignals: ["pieza ausente"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Alex Demo, 600111222",
      history: [],
      state
    });

    expect(result.reply).toContain("Te viene mejor");
    expect(result.reply).toContain("Murcia centro");
    expect(result.reply).not.toContain("disponibilidad");
    expect(result.state.location).toBe("");
    expect(result.state.availability).toBe("");
    expect(result.state.ready).toBe(false);
  });

  it("does not let Gemini ask all booking data in one message", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "trauma" as const,
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      triageLevel: "URGENT_24H" as const,
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const output = {
      reply:
        "Para poder agendarte con prioridad, necesito tu nombre y apellidos, un telefono de contacto, si prefieres nuestra clinica en Murcia o Elche y que disponibilidad tienes.",
      intent: "trauma",
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "si, acepto",
      history: [],
      state
    });

    expect(result.runtime).toBe("gemini");
    expect(result.reply).toBe("Y tu nombre y apellidos?");
    expect(result.reply.toLowerCase()).not.toContain("telefono");
    expect(result.reply.toLowerCase()).not.toContain("murcia");
    expect(result.reply.toLowerCase()).not.toContain("disponibilidad");
  });

  it("does not let Gemini repeat a booking field already captured locally", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "first_visit" as const,
      intentCode: "CITA_PRIMERA_VISITA",
      treatmentNeed: "Primera visita y diagnostico digital",
      budget: "0 EUR",
      estimatedValue: 35000,
      consent: true,
      triageLevel: "ROUTINE" as const,
      triageLabel: "Cita normal",
      clinicalReading: "Primera visita programable.",
      likelyCauses: ["revision general"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const output = {
      reply: "Me dices tu nombre y apellidos?",
      intent: "first_visit",
      intentCode: "CITA_PRIMERA_VISITA",
      treatmentNeed: "Primera visita y diagnostico digital",
      budget: "0 EUR",
      estimatedValue: 35000,
      escalated: false,
      consent: true,
      name: "",
      phone: "",
      email: "",
      location: "",
      availability: "",
      triageLevel: "ROUTINE",
      triageLabel: "Cita normal",
      clinicalReading: "Primera visita programable.",
      likelyCauses: ["revision general"],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Pedro Gomez Ruiz",
      history: [],
      state
    });

    expect(result.state.name).toBe("Pedro Gomez Ruiz");
    expect(result.reply).toContain("Y tu email");
    expect(result.reply.toLowerCase()).not.toContain("nombre");
  });

  it("does not let Gemini ask patients to bring a health card for private visits", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "trauma" as const,
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "Er Toniqui",
      phone: "654718663",
      location: "Murcia centro",
      availability: "manana 16:30",
      ready: true,
      triageLevel: "URGENT_24H" as const,
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const output = {
      reply:
        "De acuerdo, Er Toniqui. Te confirmo la cita de urgencia para manana a las 16:30 en nuestra clinica de Murcia centro.\n\nRecuerda traer tu tarjeta sanitaria.",
      intent: "trauma",
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "Er Toniqui",
      phone: "654718663",
      location: "Murcia centro",
      availability: "manana 16:30",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "ok gracias",
      history: [],
      state
    });

    expect(result.runtime).toBe("gemini");
    expect(result.reply.toLowerCase()).not.toContain("tarjeta sanitaria");
    expect(result.reply.toLowerCase()).not.toContain("sip");
  });

  it("asks morning or afternoon after location, not an open schedule question", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "implant_price" as const,
      intentCode: "IMPLANTE_VALORACION",
      treatmentNeed: "Implante dental",
      budget: "desde 1.200 EUR",
      estimatedValue: 180000,
      consent: true,
      name: "Alex Demo",
      phone: "600111222",
      email: "alex@example.com",
      triageLevel: "ROUTINE" as const,
      triageLabel: "Rutina",
      clinicalReading: "Valoracion programable de implante.",
      likelyCauses: ["pieza ausente"],
      detectedSignals: ["pieza ausente"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const output = {
      reply: "Perfecto, Murcia centro. Indicame que dias u horarios te vienen mejor y buscamos cita.",
      intent: "implant_price",
      intentCode: "IMPLANTE_VALORACION",
      treatmentNeed: "Implante dental",
      budget: "desde 1.200 EUR",
      estimatedValue: 180000,
      escalated: false,
      consent: true,
      name: "Alex Demo",
      phone: "600111222",
      location: "Murcia centro",
      availability: "",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Valoracion programable de implante.",
      likelyCauses: ["pieza ausente"],
      detectedSignals: ["pieza ausente"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Murcia",
      history: [],
      state
    });

    expect(result.reply).toContain("Te puedo proponer estos huecos");
    expect(result.reply).toContain("1.");
    expect(result.reply).toContain("2.");
    expect(result.reply).toContain("Responde con 1, 2 o 3");
    expect(result.reply).not.toContain("Que dia y hora");
  });

  it("offers concrete afternoon options when the patient asks what days are available", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      intent: "trauma" as const,
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "Alejandro Marti",
      phone: "654718663",
      location: "Murcia centro",
      triageLevel: "URGENT_24H" as const,
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const output = {
      reply:
        "Que dia y hora o franja te encaja? Por ejemplo, viernes por la manana o lunes a las 10:00.",
      intent: "trauma",
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "Alejandro Marti",
      phone: "654718663",
      location: "Murcia centro",
      availability: "",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "que dias tienes por la tarde??",
      history: [],
      state
    });

    expect(result.runtime).toBe("gemini");
    expect(result.reply).toContain("Te puedo proponer estos huecos de tarde en Murcia centro");
    expect(result.reply).toContain("1.");
    expect(result.reply).toContain("2.");
    expect(result.reply).not.toContain("Que dia y hora o franja te encaja");
  });

  it("falls back from Gemini Pro to Gemini Flash on 429", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-pro-test";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-flash-test";

    const output = {
      reply:
        "Por lo que cuentas, podemos orientarte hacia una visita de revision y dejarla preparada en Murcia el viernes por la tarde.",
      intent: "first_visit",
      intentCode: "CITA_PRIMERA_VISITA",
      treatmentNeed: "Primera visita",
      budget: "0 EUR",
      estimatedValue: 0,
      escalated: false,
      consent: true,
      name: "Pedro Test",
      phone: "612000111",
      location: "Murcia centro",
      availability: "viernes tarde",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Consulta programable sin senales de alarma.",
      likelyCauses: ["revision general"],
      detectedSignals: ["molestia puntual"],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => "quota exceeded"
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => geminiResponse(JSON.stringify(output))
      } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage:
        "Acepto guardar mis datos. Soy Pedro Test, telefono 612000111, email pedro@example.com, prefiero Murcia el viernes por la tarde y quiero una revision.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.model).toContain("fallback");
    expect(result.reply).toContain("Murcia");
    expect(result.state.ready).toBe(true);
  });

  it("uses Gemini freeform text when structured JSON is not returned", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-freeform";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () =>
        geminiResponse(
          "Parece una molestia compatible con una revision conservadora. Si te va bien, te puedo dejar orientada una visita en Murcia por la tarde y alli el doctor confirmara el tratamiento."
        )
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage:
        "Acepto guardar mis datos. Soy Marta Demo, telefono 600111222, email marta@example.com. Me duele una muela al frio y prefiero Murcia por la tarde.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.model).toContain("texto libre");
    // El guardrail de seguridad (missingClinicalData/alarma general) pisa el
    // texto libre de Gemini con el guion local: aun con todos los datos de
    // contacto ya dados, primero toca descartar fiebre/hinchazon/pus antes de
    // ofrecer huecos, asi que "Murcia" todavia no aparece en este turno.
    expect(result.reply).toContain("Antes de nada");
    expect(result.state.intent).toBe("caries_restoration");
  });

  it("extracts only the patient-facing reply when Gemini returns loose JSON", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-loose-json";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () =>
        geminiResponse(
          JSON.stringify({
            reply:
              "Lamento que estes con ese dolor. Por seguridad, lo ideal es que te vea un doctor cuanto antes; dime tu nombre y si prefieres Murcia centro o Elche - Altabix.",
            intent: "urgent_pain",
            intentCode: "urgent_pain",
            treatmentNeed: "Urgencia por dolor agudo de muela"
          })
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
    expect(result.reply).toContain("fiebre");
    expect(result.reply.toLowerCase()).not.toContain("prefieres murcia");
    expect(result.reply).not.toContain("\"reply\"");
    expect(result.reply).not.toContain("\"intent\"");
  });

  it("extracts the reply when Gemini returns a truncated JSON fragment", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-truncated-json";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () =>
        geminiResponse(
          '{\n  "reply": "Siento mucho que estes con ese dolor tan intenso. Podria tratarse de una inflamacion o afectacion del nervio, por lo que conviene que lo revise el doctor lo antes posible para darte alivio. Hoy mismo priorizamos estas urgencias en Murcia y Elche'
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
    expect(result.reply).toContain("hinchazon");
    expect(result.reply).not.toContain("Murcia y Elche");
    expect(result.reply).not.toContain("\"reply\"");
    expect(result.reply).not.toContain("{");
  });

  it("keeps escalated true and ready false when Gemini's own judgement disagrees with a local-forced escalation (GDPR erasure)", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      consent: true,
      name: "Ana Molina",
      phone: "612999111",
      email: "ana@example.com",
      location: "Murcia centro",
      availability: "viernes tarde"
    };

    const output = {
      reply: "Entendido, seguimos con la reserva.",
      intent: "implant_price",
      intentCode: "IMPLANTE_PRECIO",
      treatmentNeed: "Implante",
      budget: "Pendiente",
      estimatedValue: 0,
      escalated: false,
      consent: true,
      name: "Ana Molina",
      phone: "612999111",
      location: "Murcia centro",
      availability: "viernes tarde",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Sin hallazgos.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Alta",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "en realidad borra todos mis datos, retiro el consentimiento y no quiero seguir",
      history: [],
      state
    });

    expect(result.state.dataErasureRequested).toBe(true);
    expect(result.state.escalated).toBe(true);
    expect(result.state.ready).toBe(false);
  });

  it("keeps escalated true when a minor self-reports and Gemini disagrees (requiresGuardian)", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "Cuentame mas sobre el dolor.",
      intent: "urgent_pain",
      intentCode: "TRIAJE_DOLOR_INFECCION",
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
      clinicalReading: "Sin hallazgos.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Tengo 15 anos y me duele mucho una muela",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.state.requiresGuardian).toBe(true);
    expect(result.state.escalated).toBe(true);
    expect(result.state.ready).toBe(false);
  });

  it("keeps escalated true for non-Spanish input and Gemini disagrees (needsHumanForLanguage)", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "Sure, tell me more about your appointment.",
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
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Hello, I have a toothache and need an appointment please",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.state.escalated).toBe(true);
    expect(result.state.ready).toBe(false);
  });

  it("hotfix dental-clinical-authority: no escala solo porque Gemini devuelva escalated/triageLevel EMERGENCY - el motor local es la unica autoridad", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "Esto puede ser una urgencia, te doy prioridad.",
      intent: "urgent_pain",
      intentCode: "TRIAJE_DOLOR_INFECCION",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 70,
      escalated: true,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "EMERGENCY",
      triageLabel: "Emergencia inmediata",
      clinicalReading: "Posible complicacion grave detectada por matices del lenguaje.",
      likelyCauses: ["complicacion post-tratamiento"],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "no se que hacer, esto no tiene buena pinta",
      history: [],
      state: initialDentalAgentState
    });

    // Hotfix (fallo confirmado en produccion): antes la IA podia forzar
    // escalated/triageLevel/safetyScreened/missingClinicalData a su antojo
    // (aqui, como "red de seguridad" para emergencias que el motor local se
    // saltara), pero ese mismo mecanismo era la causa raiz de que la IA
    // pudiera marcar safetyScreened=true y vaciar missingClinicalData para
    // saltarse la pregunta de seguridad obligatoria y pasar directo a
    // diagnostico + consentimiento. mergeClinicalEscalation (openai-dental-agent.ts)
    // exige ademas una red flag validada por codigo (classifyAuthorizedRedFlagSignal)
    // en aiOutput.redFlags - decir escalated:true/triageLevel:EMERGENCY con
    // redFlags:[] (como aqui) nunca basta por si solo, se ignora.
    expect(result.state.escalated).toBe(false);
    expect(result.state.triageLevel).toBe("ROUTINE");
  });

  it("hotfix dental-clinical-authority: SI eleva el triaje cuando la IA aporta una red flag validada por codigo que el motor local no vio", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "Esto suena a una emergencia real, te doy prioridad maxima.",
      intent: "urgent_pain",
      intentCode: "TRIAJE_DOLOR_INFECCION",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 70,
      escalated: true,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "EMERGENCY",
      triageLabel: "Emergencia inmediata",
      clinicalReading: "El paciente describe dificultad para respirar con sus propias palabras.",
      likelyCauses: ["complicacion post-tratamiento"],
      detectedSignals: [],
      // Red flag validada: coincide con el patron determinista real
      // (redFlagPatterns, dental-senior-agent.ts), no es solo una etiqueta
      // inventada por la IA.
      redFlags: ["me cuesta respirar desde hace unos minutos"],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "no se que hacer, esto no tiene buena pinta",
      history: [],
      state: initialDentalAgentState
    });

    // A diferencia del test anterior (redFlags:[]), aqui SI hay una senal
    // real y validada -> el nivel se eleva y escalated pasa a true. La IA
    // solo puede subir, nunca sustituir el juicio local sin esta validacion.
    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.state.escalated).toBe(true);
  });

  it("hotfix dental-clinical-authority: ignora una 'red flag' de la IA que no coincide con ningun patron determinista", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "Esto suena grave, te doy prioridad maxima.",
      intent: "urgent_pain",
      intentCode: "TRIAJE_DOLOR_INFECCION",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 70,
      escalated: true,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "EMERGENCY",
      triageLabel: "Emergencia inmediata",
      clinicalReading: "El paciente parece muy nervioso al escribir.",
      likelyCauses: [],
      detectedSignals: [],
      // "Red flag" inventada por la IA que no coincide con ningun patron
      // determinista real - debe ignorarse por completo.
      redFlags: ["el paciente parece muy nervioso"],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "no se que hacer, esto no tiene buena pinta",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.state.triageLevel).toBe("ROUTINE");
    expect(result.state.escalated).toBe(false);
  });

  it("hotfix dental-clinical-authority: la IA nunca puede bajar un triaje EMERGENCY real del motor local", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "No parece grave, puedes esperar a la semana que viene sin problema.",
      intent: "urgent_pain",
      intentCode: "TRIAJE_DOLOR_INFECCION",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 70,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "ROUTINE",
      triageLabel: "Cita normal",
      clinicalReading: "Nada preocupante.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    // El motor local SI detecta una emergencia real en el propio mensaje del
    // paciente (dificultad para respirar) - la IA, en cambio, la minimiza a
    // ROUTINE/escalated:false. El resultado final debe mantenerse en el
    // nivel local (EMERGENCY), nunca bajar al nivel que sugiere la IA.
    const result = await runDentalAgentTurn({
      latestPatientMessage: "no puedo respirar bien y me duele muchisimo",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.state.escalated).toBe(true);
  });

  it("does not force escalated or block ready when nothing triggers escalation and Gemini agrees", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const state = {
      ...initialDentalAgentState,
      consent: true,
      name: "Pedro Test",
      phone: "612000111",
      email: "pedro@example.com",
      location: "Murcia centro",
      availability: "viernes tarde"
    };

    const output = {
      reply: "Perfecto, quedas registrado para la revision.",
      intent: "first_visit",
      intentCode: "PRIMERA_VISITA",
      treatmentNeed: "Revision general",
      budget: "Pendiente",
      estimatedValue: 0,
      escalated: false,
      consent: true,
      name: "Pedro Test",
      phone: "612000111",
      location: "Murcia centro",
      availability: "viernes tarde",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Sin hallazgos.",
      likelyCauses: [],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Alta",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "quiero una revision general",
      history: [],
      state
    });

    expect(result.state.escalated).toBe(false);
    expect(result.state.ready).toBe(true);
  });

  it("hotfix dental-clinical-authority: repite el fallo real de produccion - 'me duele al morder' ya no permite diagnostico prematuro ni salta la pregunta de seguridad", async () => {
    delete process.env.LLM_PROVIDER;
    const openAiKeyEnvName = ["OPENAI", "API", "KEY"].join("_");
    process.env[openAiKeyEnvName] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    // Fallo real reportado en produccion: el proveedor real devolvia esto -
    // diagnostico prematuro (caries/filtracion de empaste) y saltaba directo
    // a pedir consentimiento, marcando safetyScreened=true y vaciando
    // missingClinicalData para evitar que el guardrail (preparePatientReply)
    // detectara que la pregunta de seguridad obligatoria no se hizo.
    const output = {
      reply:
        "Podria ser caries o filtracion de empaste, conviene revisarlo con calma.",
      intent: "caries_restoration",
      intentCode: "CARIES_MORDER",
      treatmentNeed: "Restauracion",
      budget: "desde 60 EUR",
      estimatedValue: 6000,
      escalated: false,
      consent: true,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "ROUTINE",
      triageLabel: "Rutina",
      clinicalReading: "Caries o filtracion de empaste probable.",
      likelyCauses: ["caries", "filtracion de empaste"],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Alta",
      safetyScreened: true
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(output) })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "Me duele al morder.",
      history: [],
      state: initialDentalAgentState
    });

    // El motor local (localState) es la unica autoridad: para caries_restoration
    // la pregunta de seguridad general (fiebre/hinchazon/pus/abrir boca/tragar)
    // no pasa por missingClinicalData (ver nextStep, dental-senior-agent.ts) -
    // safetyScreened se mantiene false pase lo que pase en aiOutput, y el
    // nuevo guardrail isMandatorySafetyScreenQuestion (guardrails.ts) compara
    // localReply/aiReply directamente para descartar el diagnostico prematuro.
    expect(result.state.safetyScreened).toBe(false);
    expect(result.state.consent).toBe(false);
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("caries");
    expect(reply).not.toContain("filtracion de empaste");
    expect(reply).not.toContain("filtración de empaste");
    expect(reply).not.toContain("aceptas que guardemos");
    expect(reply).toContain("?");
  });

  it("CASO 7 (hotfix dental-negation-context): OpenAI usa la misma interpretacion de negacion - bloquea fractura/luxacion aunque aiOutput reclame trauma", async () => {
    delete process.env.LLM_PROVIDER;
    const openAiKeyEnvName = ["OPENAI", "API", "KEY"].join("_");
    process.env[openAiKeyEnvName] = "test-key";
    process.env.OPENAI_MODEL = "gpt-test";

    const output = {
      reply: "Podria ser una fractura dental o luxacion; cuentame cuando te diste el golpe.",
      intent: "trauma",
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Traumatismo dental",
      budget: "desde 70 EUR",
      estimatedValue: 70,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Posible fractura o luxacion dental.",
      likelyCauses: ["fractura dental", "luxacion"],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(output) })
    } as Response);

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "Es poco y no he recibido ningun golpe.",
      history: [],
      state: {
        ...initialDentalAgentState,
        intent: "periodontics",
        lastQuestionKey: "bleeding_severity_or_impact"
      }
    });

    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("fractura");
    expect(reply).not.toContain("luxacion");
    expect(reply).not.toContain("luxación");
    expect(reply).not.toContain("cuando te diste el golpe");
  });

  it("CASO 7 (hotfix dental-negation-context): Gemini usa la misma interpretacion de negacion - bloquea fractura/luxacion aunque aiOutput reclame trauma", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply: "Podria ser una fractura dental o luxacion; cuentame cuando te diste el golpe.",
      intent: "trauma",
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Traumatismo dental",
      budget: "desde 70 EUR",
      estimatedValue: 70,
      escalated: false,
      consent: false,
      name: "",
      phone: "",
      location: "",
      availability: "",
      triageLevel: "URGENT_24H",
      triageLabel: "Urgencia 24h",
      clinicalReading: "Posible fractura o luxacion dental.",
      likelyCauses: ["fractura dental", "luxacion"],
      detectedSignals: [],
      redFlags: [],
      missingClinicalData: [],
      confidence: "Media",
      safetyScreened: false
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => geminiResponse(JSON.stringify(output))
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "Es poco y no he recibido ningun golpe.",
      history: [],
      state: {
        ...initialDentalAgentState,
        intent: "periodontics",
        lastQuestionKey: "bleeding_severity_or_impact"
      }
    });

    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("fractura");
    expect(reply).not.toContain("luxacion");
    expect(reply).not.toContain("luxación");
    expect(reply).not.toContain("cuando te diste el golpe");
  });
});
