import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("permite hasta el limite dentro de la ventana", () => {
    const now = 1_000_000;
    expect(checkRateLimit("k", 3, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit("k", 3, 60_000, now + 1).allowed).toBe(true);
    expect(checkRateLimit("k", 3, 60_000, now + 2).allowed).toBe(true);
    expect(checkRateLimit("k", 3, 60_000, now + 3).allowed).toBe(false);
  });

  it("resetea al expirar la ventana", () => {
    const now = 1_000_000;
    checkRateLimit("k", 1, 60_000, now);
    expect(checkRateLimit("k", 1, 60_000, now + 10).allowed).toBe(false);
    expect(checkRateLimit("k", 1, 60_000, now + 60_001).allowed).toBe(true);
  });

  it("aisla claves distintas", () => {
    const now = 1_000_000;
    checkRateLimit("a", 1, 60_000, now);
    expect(checkRateLimit("b", 1, 60_000, now).allowed).toBe(true);
  });

  it("informa remaining decreciente", () => {
    const now = 1_000_000;
    expect(checkRateLimit("r", 2, 60_000, now).remaining).toBe(1);
    expect(checkRateLimit("r", 2, 60_000, now + 1).remaining).toBe(0);
  });
});
