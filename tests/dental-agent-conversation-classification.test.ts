import { afterEach, describe, expect, it, vi } from "vitest";
import { initialDentalAgentState, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import { runOpenAiDentalAgentTurn } from "@/lib/agent/openai-dental-agent";

const OPENAI_KEY_ENV = ["OPENAI", "API", "KEY"].join("_");

const ORIGINAL_ENV = {
  provider: process.env.LLM_PROVIDER,
  openAiKey: process.env[OPENAI_KEY_ENV]
};

afterEach(() => {
  process.env.LLM_PROVIDER = ORIGINAL_ENV.provider;
  process.env[OPENAI_KEY_ENV] = ORIGINAL_ENV.openAiKey;
  vi.restoreAllMocks();
});

function readyBookedState(overrides: Partial<DentalAgentState> = {}): DentalAgentState {
  return {
    ...initialDentalAgentState,
    intent: "prosthetics",
    consent: true,
    name: "Sara Ruiz",
    phone: "654718663",
    email: "sara@example.com",
    location: "Elche - Altabix",
    availability: "viernes, 24/07, 10:45",
    offeredAvailabilityOptions: [],
    ready: true,
    ...overrides
  };
}

describe("conversation field classification (deterministic, no LLM call needed)", () => {
  it('"cita para una limpieza" produces conversationIntent book_appointment and treatmentTopic hygiene', async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "cita para una limpieza",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.runtime).toBe("local");
    expect(result.conversationIntent).toBe("book_appointment");
    expect(result.treatmentTopic).toBe("hygiene");
  });

  it('"cita para una limpieza" is never interpreted as periodontics', async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "cita para una limpieza",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.state.intent).toBe("reactivation");
    expect(result.state.intent).not.toBe("periodontics");
    expect(result.treatmentTopic).not.toBe("periodontics");
    expect(result.reply.toLowerCase()).not.toContain("periodontitis");
  });

  it("a price request does not start clinical triage", async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "cuanto cuesta un implante?",
      history: [],
      state: initialDentalAgentState
    });

    expect(result.conversationIntent).not.toBe("symptom");
    expect(result.reply.toLowerCase()).not.toContain("fiebre");
    expect(result.reply.toLowerCase()).not.toContain("hinchazon");
  });

  it("a thanks after a confirmed booking does not restart the flow", async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "gracias",
      history: [],
      state: readyBookedState()
    });

    expect(result.runtime).toBe("local");
    expect(result.reply).toContain("Gracias a ti");
    expect(result.reply).not.toContain("Aquí sigo");
    expect(result.reply).not.toContain("1.");
    expect(result.state.availability).toBe("viernes, 24/07, 10:45");
  });

  it("an already-selected availability is never offered again", async () => {
    delete process.env.LLM_PROVIDER;
    delete process.env[OPENAI_KEY_ENV];

    const result = await runOpenAiDentalAgentTurn({
      latestPatientMessage: "perfecto",
      history: [],
      state: readyBookedState()
    });

    expect(result.runtime).toBe("local");
    expect(result.reply.toLowerCase()).not.toContain("te puedo proponer");
    expect(result.reply).not.toContain("1.");
    expect(result.reply).not.toContain("2.");
    expect(result.state.offeredAvailabilityOptions).toEqual([]);
    expect(result.state.availability).toBe("viernes, 24/07, 10:45");
  });
});
