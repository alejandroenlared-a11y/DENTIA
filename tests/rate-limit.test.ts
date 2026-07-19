import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkPersistentRateLimit, checkRateLimit, resetRateLimits } from "@/lib/rate-limit";

const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const originalFetch = global.fetch;

function restoreEnv(name: "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    global.fetch = originalFetch;
  });

  afterEach(() => {
    restoreEnv("UPSTASH_REDIS_REST_URL", originalRedisUrl);
    restoreEnv("UPSTASH_REDIS_REST_TOKEN", originalRedisToken);
    global.fetch = originalFetch;
    vi.restoreAllMocks();
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

  it("usa Upstash REST cuando esta configurado", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 2 }, { result: 1 }]
    });
    global.fetch = fetchMock;

    const result = await checkPersistentRateLimit("api:tenant", 3, 60_000, 1_000);

    expect(result).toEqual({ allowed: true, remaining: 1, resetAt: 61_000 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://redis.example.com/multi-exec",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify([
          ["INCR", "dentia:rl:api:tenant"],
          ["PEXPIRE", "dentia:rl:api:tenant", 60_000, "NX"]
        ])
      })
    );
  });

  it("vuelve a memoria si Upstash falla", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect((await checkPersistentRateLimit("fallback", 1, 60_000, 1_000)).allowed).toBe(true);
    expect((await checkPersistentRateLimit("fallback", 1, 60_000, 1_001)).allowed).toBe(false);
  });
});
