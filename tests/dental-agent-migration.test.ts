import { describe, expect, it } from "vitest";
import { normalizeDentalAgentState } from "@/lib/agent/dental-agent-migration";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";

describe("normalizeDentalAgentState", () => {
  it("fills safe defaults for an old state without any of the new fields", () => {
    const result = normalizeDentalAgentState({});
    expect(result.treatmentTopic).toBe("unknown");
    expect(result.conversationIntent).toBe("unknown");
    expect(result.bookingStatus).toBe("IDLE");
    expect(result.conversationStatus).toBe("ACTIVE");
    expect(result.name).toBe("");
    expect(result.offeredAvailabilityOptions).toEqual([]);
  });

  it("never marks a booking as CONFIRMED from a textual availability string alone", () => {
    const oldState = {
      ...initialDentalAgentState,
      intent: "prosthetics",
      consent: true,
      name: "Juan Perez",
      phone: "611222333",
      email: "juan@example.com",
      location: "Murcia centro",
      availability: "viernes, 24/07, 11:00",
      ready: true
    };

    const withoutContext = normalizeDentalAgentState(oldState);
    expect(withoutContext.bookingStatus).toBe("PREBOOKED");
    expect(withoutContext.bookingStatus).not.toBe("CONFIRMED");

    const withRealConfirmation = normalizeDentalAgentState(oldState, { appointmentStatus: "CONFIRMED" });
    expect(withRealConfirmation.bookingStatus).toBe("CONFIRMED");
  });

  it("maps a periodontics intent to its treatment topic and preserves clinical fields", () => {
    const oldState = {
      ...initialDentalAgentState,
      intent: "periodontics",
      redFlags: ["sangrado abundante"],
      missingClinicalData: ["Hay sangrado al cepillar, mal aliento, movilidad o encia retraida?"]
    };

    const result = normalizeDentalAgentState(oldState);
    expect(result.treatmentTopic).toBe("periodontics");
    expect(result.redFlags).toEqual(["sangrado abundante"]);
    expect(result.missingClinicalData).toEqual(["Hay sangrado al cepillar, mal aliento, movilidad o encia retraida?"]);
  });

  it("preserves already-collected patient data and infers provide_data as the conversation intent", () => {
    const oldState = {
      ...initialDentalAgentState,
      intent: "whitening",
      consent: true,
      name: "Sara Ruiz",
      phone: "654718663",
      email: "sara@example.com",
      location: "Elche"
    };

    const result = normalizeDentalAgentState(oldState);
    expect(result.name).toBe("Sara Ruiz");
    expect(result.phone).toBe("654718663");
    expect(result.email).toBe("sara@example.com");
    expect(result.location).toBe("Elche");
    expect(result.conversationIntent).toBe("provide_data");
    expect(result.treatmentTopic).toBe("whitening");
  });

  it("ignores non-object input instead of throwing", () => {
    expect(() => normalizeDentalAgentState(null)).not.toThrow();
    expect(() => normalizeDentalAgentState("perfecto")).not.toThrow();
    expect(normalizeDentalAgentState(undefined).bookingStatus).toBe("IDLE");
  });
});
