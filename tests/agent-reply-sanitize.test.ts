import { describe, expect, it } from "vitest";
import { formatPendingBookingConfirmation, sanitizeReceptionCallbackAfterNormalBooking } from "@/lib/agent";

describe("sanitizeReceptionCallbackAfterNormalBooking", () => {
  it("removes reception callback promises after a normal appointment is created", () => {
    const reply = [
      "Perfecto, te dejo pre-reservada la cita viernes 17 de julio a las 10:30.",
      "Recepcion te llamara lo antes posible para confirmarte la cita."
    ].join("\n\n");

    const sanitized = sanitizeReceptionCallbackAfterNormalBooking(reply, {
      appointmentCreated: true,
      escalated: false,
      urgentBooking: false
    });

    expect(sanitized).toBe("Perfecto, te dejo pre-reservada la cita viernes 17 de julio a las 10:30.");
    expect(sanitized.toLowerCase()).not.toContain("recepcion");
    expect(sanitized.toLowerCase()).not.toContain("llamara");
  });

  it("keeps callback promises when the conversation is escalated", () => {
    const reply = "Queda registrado con prioridad.\n\nRecepcion te llamara lo antes posible.";

    expect(
      sanitizeReceptionCallbackAfterNormalBooking(reply, {
        appointmentCreated: true,
        escalated: true,
        urgentBooking: false
      })
    ).toBe(reply);
  });
});

describe("formatPendingBookingConfirmation", () => {
  it("does not mention a provider in patient-facing option confirmations", () => {
    const reply = formatPendingBookingConfirmation(new Date("2026-07-20T15:00:00.000Z"));

    expect(reply).toContain("pre-reservada la cita");
    expect(reply.toLowerCase()).not.toContain(" dr");
    expect(reply.toLowerCase()).not.toContain("dra");
    expect(reply.toLowerCase()).not.toContain("doctor");
    expect(reply.toLowerCase()).not.toContain("doctora");
  });
});
