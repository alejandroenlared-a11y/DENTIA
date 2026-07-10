import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";

const originalApiKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
  process.env.OPENAI_MODEL = originalModel;
  vi.restoreAllMocks();
});

describe("runOpenAiDentalAgentTurn", () => {
  it("falls back to the local dental engine when OPENAI_API_KEY is missing", async () => {
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
});
