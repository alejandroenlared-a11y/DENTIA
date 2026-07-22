import { describe, expect, it } from "vitest";
import { reduceDentalTurn } from "@/lib/agent/dental-agent-reducer";
import { normalizeDentalAgentState } from "@/lib/agent/dental-agent-migration";

describe("reduceDentalTurn", () => {
  it("ignores SLOTS_OFFERED once the booking is already PREBOOKED (no reofrecer huecos)", () => {
    const prebooked = reduceDentalTurn(
      normalizeDentalAgentState({}),
      { type: "BOOKING_PREBOOKED", availability: "viernes, 24/07, 11:00" }
    );

    const result = reduceDentalTurn(prebooked, {
      type: "SLOTS_OFFERED",
      options: ["jueves, 23/07, 10:00", "lunes, 27/07, 09:00"]
    });

    expect(result).toBe(prebooked);
    expect(result.offeredAvailabilityOptions).toEqual([]);
    expect(result.availability).toBe("viernes, 24/07, 11:00");
  });

  it("BOOKING_PREBOOKED never sets CONFIRMED by itself", () => {
    const result = reduceDentalTurn(normalizeDentalAgentState({}), {
      type: "BOOKING_PREBOOKED",
      availability: "viernes, 24/07, 11:00"
    });
    expect(result.bookingStatus).toBe("PREBOOKED");
    expect(result.ready).toBe(true);
  });

  it("APPOINTMENT_CONFIRMED is ignored unless bookingStatus is already SLOT_SELECTED or PREBOOKED", () => {
    const idle = normalizeDentalAgentState({});
    const ignored = reduceDentalTurn(idle, { type: "APPOINTMENT_CONFIRMED" });
    expect(ignored.bookingStatus).toBe("IDLE");

    const prebooked = reduceDentalTurn(idle, {
      type: "BOOKING_PREBOOKED",
      availability: "viernes, 24/07, 11:00"
    });
    const confirmed = reduceDentalTurn(prebooked, { type: "APPOINTMENT_CONFIRMED" });
    expect(confirmed.bookingStatus).toBe("CONFIRMED");
  });

  it("closes the conversation on PATIENT_THANKS only after a real booking exists", () => {
    const idle = normalizeDentalAgentState({});
    const thanksBeforeBooking = reduceDentalTurn(idle, { type: "PATIENT_THANKS" });
    expect(thanksBeforeBooking.conversationStatus).toBe("ACTIVE");
    expect(thanksBeforeBooking.conversationIntent).toBe("thanks");

    const prebooked = reduceDentalTurn(idle, {
      type: "BOOKING_PREBOOKED",
      availability: "viernes, 24/07, 11:00"
    });
    const thanksAfterBooking = reduceDentalTurn(prebooked, { type: "PATIENT_THANKS" });
    expect(thanksAfterBooking.conversationStatus).toBe("CLOSED");
  });

  it("reopens a CLOSED conversation on the next patient message", () => {
    const prebooked = reduceDentalTurn(normalizeDentalAgentState({}), {
      type: "BOOKING_PREBOOKED",
      availability: "viernes, 24/07, 11:00"
    });
    const closed = reduceDentalTurn(prebooked, { type: "PATIENT_THANKS" });
    expect(closed.conversationStatus).toBe("CLOSED");

    const reopened = reduceDentalTurn(closed, { type: "PATIENT_MESSAGE" });
    expect(reopened.conversationStatus).toBe("ACTIVE");
    expect(reopened.conversationIntent).toBe("unknown");
  });

  it("PATIENT_MESSAGE is a no-op when the conversation is not closed", () => {
    const idle = normalizeDentalAgentState({});
    const result = reduceDentalTurn(idle, { type: "PATIENT_MESSAGE" });
    expect(result).toBe(idle);
  });

  it("APPOINTMENT_CANCELLED resets availability and ready", () => {
    const prebooked = reduceDentalTurn(normalizeDentalAgentState({}), {
      type: "BOOKING_PREBOOKED",
      availability: "viernes, 24/07, 11:00"
    });
    const cancelled = reduceDentalTurn(prebooked, { type: "APPOINTMENT_CANCELLED" });
    expect(cancelled.bookingStatus).toBe("CANCELLED");
    expect(cancelled.ready).toBe(false);
    expect(cancelled.availability).toBe("");
  });
});
