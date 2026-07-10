import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatTime, getInitials } from "@/lib/format";

describe("formatMoney", () => {
  it("formatea centimos a euros sin decimales", () => {
    expect(formatMoney(35000)).toMatch(/^350\s?€$/u);
  });

  it("trata null como cero", () => {
    expect(formatMoney(null)).toMatch(/^0\s?€$/u);
  });
});

describe("formatDate", () => {
  it("usa formato dd/mm/aaaa", () => {
    expect(formatDate(new Date("2026-07-09T10:30:00.000Z"))).toBe("09/07/2026");
  });
});

describe("formatTime", () => {
  it("devuelve hora con dos digitos", () => {
    expect(formatTime(new Date("2026-07-09T10:05:00.000Z"))).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("getInitials", () => {
  it("devuelve dos iniciales", () => {
    expect(getInitials("Laura Ortiz")).toBe("LO");
  });

  it("gestiona nombre unico", () => {
    expect(getInitials("Laura")).toBe("L");
  });

  it("ignora espacios extra", () => {
    expect(getInitials("  Ana   Maria  Perez ")).toBe("AM");
  });

  it("devuelve cadena vacia sin nombre", () => {
    expect(getInitials("")).toBe("");
  });
});
