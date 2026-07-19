import { describe, expect, it } from "vitest";
import { formatWeekRange, getBusinessWeekDays, getGreeting, getWeekDays } from "@/lib/calendar";

describe("getWeekDays", () => {
  it("devuelve 7 dias empezando en lunes", () => {
    const days = getWeekDays(new Date("2026-07-09T12:00:00.000Z"));
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ iso: "2026-07-06", label: "Lun", dayNumber: 6 });
    expect(days[6]).toEqual({ iso: "2026-07-12", label: "Dom", dayNumber: 12 });
  });

  it("funciona cuando la referencia es lunes", () => {
    const days = getWeekDays(new Date("2026-07-06T00:00:00.000Z"));
    expect(days[0].iso).toBe("2026-07-06");
  });

  it("funciona cuando la referencia es domingo", () => {
    const days = getWeekDays(new Date("2026-07-12T23:00:00.000Z"));
    expect(days[0].iso).toBe("2026-07-06");
    expect(days[6].iso).toBe("2026-07-12");
  });

  it("cruza el cambio de mes", () => {
    const days = getWeekDays(new Date("2026-08-01T12:00:00.000Z"));
    expect(days[0].iso).toBe("2026-07-27");
    expect(days[6].iso).toBe("2026-08-02");
  });
});

describe("getBusinessWeekDays", () => {
  it("devuelve solo lunes a viernes para la vista profesional de agenda", () => {
    const days = getBusinessWeekDays(new Date("2026-07-09T12:00:00.000Z"));
    expect(days).toHaveLength(5);
    expect(days[0]).toEqual({ iso: "2026-07-06", label: "Lun", dayNumber: 6 });
    expect(days[4]).toEqual({ iso: "2026-07-10", label: "Vie", dayNumber: 10 });
  });
});

describe("formatWeekRange", () => {
  it("describe la semana en espanol", () => {
    const days = getWeekDays(new Date("2026-07-09T12:00:00.000Z"));
    expect(formatWeekRange(days)).toBe("Semana del 6 al 12 de julio de 2026");
  });

  it("devuelve cadena vacia sin dias", () => {
    expect(formatWeekRange([])).toBe("");
  });
});

describe("getGreeting", () => {
  it("saluda segun la hora", () => {
    expect(getGreeting(new Date(2026, 6, 9, 9, 0))).toBe("Buenos dias");
    expect(getGreeting(new Date(2026, 6, 9, 16, 0))).toBe("Buenas tardes");
    expect(getGreeting(new Date(2026, 6, 9, 22, 0))).toBe("Buenas noches");
    expect(getGreeting(new Date(2026, 6, 9, 3, 0))).toBe("Buenas noches");
  });
});
