import { afterEach, describe, expect, it, vi } from "vitest";
import { formatUrgentSlotSentence, inferPreferredStartForTest, roundUpToSlot, type UrgentBooking } from "@/lib/agent";

afterEach(() => {
  vi.useRealTimers();
});

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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T10:00:00"));
    const startsAt = new Date("2026-07-19T11:00:00");
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
