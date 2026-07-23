import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatUrgentSlotSentence, inferPreferredStartForTest, roundUpToSlot, type UrgentBooking } from "@/lib/agent";

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
  // Fijamos la hora "actual" al mediodia para que sumar 1h nunca cruce
  // medianoche (bug real: si el test corria pasadas las 23:00, sumar 1h
  // desbordaba al dia siguiente y "hoy" dejaba de aparecer en la frase).
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

describe("inferPreferredStartForTest", () => {
  it("respeta manana por la tarde como manana a las 17:00", () => {
    const now = new Date("2026-07-15T16:56:00");
    const preferred = inferPreferredStartForTest("manana tarde", now);

    expect(preferred.toISOString()).toBe("2026-07-16T15:00:00.000Z");
    expect(preferred.getDate()).toBe(16);
    expect(preferred.getHours()).toBe(17);
  });
});
