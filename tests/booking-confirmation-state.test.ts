import { describe, expect, it } from "vitest";
import { buildConfirmedBookingState } from "@/lib/agent";
import { hasConcreteAvailability, initialDentalAgentState, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import { jumpsToBookingOptions, isBookingClosingAcknowledgment } from "@/lib/agent/guardrails";

function offeredState(overrides: Partial<DentalAgentState> = {}): DentalAgentState {
  return {
    ...initialDentalAgentState,
    intent: "prosthetics",
    consent: true,
    name: "Juan Perez",
    phone: "611222333",
    email: "juan@example.com",
    location: "Murcia centro",
    availability: "",
    offeredAvailabilityOptions: ["jueves, 23/07, 10:00", "viernes, 24/07, 11:00", "lunes, 27/07, 10:00"],
    ready: false,
    ...overrides
  };
}

describe("buildConfirmedBookingState", () => {
  it("sets a concrete availability, clears offered options and marks ready after the patient picks a slot", () => {
    // Bug real (produccion): tras elegir un hueco de los 3 propuestos, el
    // mensaje de confirmacion ("Perfecto, te dejo pre-reservada...") no
    // guardaba dentalState. En el siguiente turno ("perfecto"),
    // extractPreviousDentalState retrocedia al mensaje ANTERIOR (el que
    // ofrecio los huecos), con availability="" y las 3 opciones aun puestas,
    // y Clara volvia a proponer los mismos huecos como si nada estuviera
    // reservado.
    const previousState = offeredState();
    const startsAt = new Date("2026-07-24T11:00:00");

    const confirmedState = buildConfirmedBookingState(previousState, startsAt);

    expect(confirmedState.offeredAvailabilityOptions).toEqual([]);
    expect(confirmedState.ready).toBe(true);
    expect(hasConcreteAvailability(confirmedState.availability)).toBe(true);
  });

  it("the resulting state makes the anti-re-offer guardrail actually fire for perfecto", () => {
    const previousState = offeredState();
    const startsAt = new Date("2026-07-24T11:00:00");
    const confirmedState = buildConfirmedBookingState(previousState, startsAt);

    const geminiReOffer = "Perfecto, viernes te viene genial. Respondeme para dejarlo confirmado.";
    expect(hasConcreteAvailability(confirmedState.availability)).toBe(true);
    expect(jumpsToBookingOptions(geminiReOffer)).toBe(true);
    expect(isBookingClosingAcknowledgment("perfecto")).toBe(true);
  });

  // Codex (cierre de pre-reserva, Caso A): bookingStatus solo se recalculaba
  // dentro de runDentalSeniorTurn - este estado se construye directamente al
  // elegir hueco (fuera de ese turno) y se quedaba con el bookingStatus
  // STALE de antes de elegir (SLOTS_OFFERED), nunca PREBOOKED.
  it("sets bookingStatus to PREBOOKED (the pre-reservation status) right after the slot is picked", () => {
    const previousState = offeredState({ bookingStatus: "SLOTS_OFFERED" });
    const startsAt = new Date("2026-07-27T10:00:00");

    const confirmedState = buildConfirmedBookingState(previousState, startsAt);

    expect(confirmedState.bookingStatus).toBe("PREBOOKED");
  });

  it("keeps the exact selected slot - never swaps it for another option", () => {
    const previousState = offeredState();
    const startsAt = new Date("2026-07-27T10:00:00");

    const confirmedState = buildConfirmedBookingState(previousState, startsAt);

    expect(confirmedState.availability).toContain("27");
    expect(confirmedState.availability).toContain("10:00");
    expect(confirmedState.offeredAvailabilityOptions).toEqual([]);
  });
});
