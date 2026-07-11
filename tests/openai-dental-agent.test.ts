import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runDentalAgentTurn, runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";

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
        "Por lo que cuentas, parece una consulta de encias que conviene revisar con prioridad. Te dejo una pre-reserva en Murcia por la tarde y el doctor confirmara el plan.",
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
      availability: "tarde",
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
        "Me sangran las encias. Acepto que guardes mis datos. Soy Paula Test, telefono 613888777. Prefiero Murcia por la tarde.",
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

  it("uses Gemini when LLM_PROVIDER=gemini", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-test-model";

    const output = {
      reply:
        "Por lo que cuentas, encaja con una consulta de primera visita para revisar esa molestia y te puedo dejar una propuesta en Elche esta semana.",
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
      availability: "manana",
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
      json: async () => ({
        steps: [
          {
            type: "model_output",
            content: [{ type: "text", text: `\`\`\`json\n${JSON.stringify(output)}\n\`\`\`` }]
          }
        ]
      })
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage:
        "Acepto que guardes mis datos. Soy Lucia Test, telefono 611000999 y prefiero Elche por la manana. Quiero una revision.",
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

  it("falls back from Gemini Pro to Gemini Flash on 429", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-pro-test";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-flash-test";

    const output = {
      reply:
        "Por lo que cuentas, podemos orientarte hacia una visita de revision y dejarla preparada en Murcia por la tarde.",
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
      availability: "tarde",
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
        json: async () => ({
          output_text: JSON.stringify(output)
        })
      } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage:
        "Acepto guardar mis datos. Soy Pedro Test, telefono 612000111, prefiero Murcia por la tarde y quiero una revision.",
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
      json: async () => ({
        output_text:
          "Parece una molestia compatible con una revision conservadora. Si te va bien, te puedo dejar orientada una visita en Murcia por la tarde y alli el doctor confirmara el tratamiento."
      })
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage:
        "Acepto guardar mis datos. Soy Marta Demo, telefono 600111222. Me duele una muela al frio y prefiero Murcia por la tarde.",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.model).toContain("texto libre");
    expect(result.reply).toContain("Murcia");
    expect(result.state.intent).toBe("caries_restoration");
  });

  it("extracts only the patient-facing reply when Gemini returns loose JSON", async () => {
    process.env.LLM_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "gemini-test-key";
    process.env.GEMINI_MODEL = "gemini-loose-json";

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          reply:
            "Lamento que estes con ese dolor. Por seguridad, lo ideal es que te vea un doctor cuanto antes; dime tu nombre y si prefieres Murcia centro o Elche - Altabix.",
          intent: "urgent_pain",
          intentCode: "urgent_pain",
          treatmentNeed: "Urgencia por dolor agudo de muela"
        })
      })
    } as Response);

    const result = await runDentalAgentTurn({
      latestPatientMessage: "ME DUELE MUCHO UNA MUELA",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("gemini");
    expect(result.model).toContain("texto libre");
    expect(result.reply).toBe(
      "Lamento que estes con ese dolor. Por seguridad, lo ideal es que te vea un doctor cuanto antes; dime tu nombre y si prefieres Murcia centro o Elche - Altabix."
    );
    expect(result.reply).not.toContain("\"reply\"");
    expect(result.reply).not.toContain("\"intent\"");
  });
});
