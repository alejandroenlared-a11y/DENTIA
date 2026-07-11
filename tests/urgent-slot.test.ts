import { describe, expect, it } from "vitest";
import { formatUrgentSlotSentence, roundUpToSlot, type UrgentBooking } from "@/lib/agent";

describe("roundUpToSlot", () => {
  it("redondea hacia arriba al siguiente bloque de 30 minutos", () => {
    const input = new Date("2026-07-11T10:05:00");
    expect(roundUpToSlot(input).toISOString()).toBe(new Date("2026-07-11T10:30:00").toISOString());
  });

  it("no mueve una hora que ya cae justo en bloque", () => {
    const input = new Date("2026-07-11T10:30:00");
    expect(roundUpToSlot(input).toISOString()).toBe(new Date("2026-07-11T10:30:00").toISOString());
  });
});

describe("formatUrgentSlotSentence", () => {
  it("dice 'hoy' cuando la cita cae en el dia actual", () => {
    const now = new Date();
    const startsAt = new Date(now);
    startsAt.setHours(now.getHours() + 1, 0, 0, 0);
    const booking: UrgentBooking = { startsAt, providerName: "Dra. Ruiz" };

    const sentence = formatUrgentSlotSentence(booking);
    expect(sentence).toContain("hoy");
    expect(sentence).toContain("Dra. Ruiz");
    expect(sentence).not.toContain("esperes a que te llamemos.  ");
  });

  it("incluye la sede cuando hay operatorio asignado", () => {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 1);
    const booking: UrgentBooking = { startsAt, providerName: "Dr. Gomez", operatoryName: "Gabinete 2 Elche" };

    const sentence = formatUrgentSlotSentence(booking);
    expect(sentence).toContain("en Gabinete 2 Elche");
    expect(sentence).not.toContain("hoy");
  });
});
