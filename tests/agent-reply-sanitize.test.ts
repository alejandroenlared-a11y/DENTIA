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

  // Codex (cierre de pre-reserva): tras elegir hueco el flujo ha terminado -
  // Clara ya no debe invitar a "cambiar" ni ofrecer mas huecos. Bug real:
  // "Si no te encaja, dime cambiar y te doy otras opciones" reabria un
  // flujo que ya se habia cerrado.
  it("closes the flow with a single polite message: never invites to reopen with 'cambiar' or more slots", () => {
    const reply = formatPendingBookingConfirmation(new Date("2026-07-24T09:00:00.000Z"));

    expect(reply.toLowerCase()).not.toContain("si no te encaja");
    expect(reply.toLowerCase()).not.toContain("dime cambiar");
    expect(reply.toLowerCase()).not.toContain("otras opciones");
    expect(reply.toLowerCase()).not.toContain("confirmada");
    expect(reply).toContain("pre-reservada");
    expect(reply).toContain("La clínica revisará la solicitud y se pondrá en contacto contigo para confirmarla.");
    expect(reply).toContain("Gracias por confiar en nosotros.");
    expect(reply).toContain("Que tengas un buen día.");
  });
});
