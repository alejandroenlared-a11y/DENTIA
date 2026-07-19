interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const REDIS_TIMEOUT_MS = 1500;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  buckets.set(key, { count: bucket.count + 1, resetAt: bucket.resetAt });
  return { allowed: true, remaining: limit - bucket.count - 1, resetAt: bucket.resetAt };
}

export function resetRateLimits(): void {
  buckets.clear();
}

export async function checkPersistentRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    return checkRateLimit(key, limit, windowMs, now);
  }

  const redisKey = `dentia:rl:${key}`;
  try {
    const response = await fetch(`${redisUrl.replace(/\/+$/, "")}/multi-exec`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${redisToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["PEXPIRE", redisKey, windowMs, "NX"]
      ]),
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`Upstash rate limit failed with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const count = Number(Array.isArray(payload) ? payload[0]?.result : NaN);
    if (!Number.isFinite(count)) {
      throw new Error("Upstash rate limit response is not numeric");
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + windowMs
    };
  } catch (error) {
    console.warn("persistent rate limit unavailable, falling back to memory", error);
    return checkRateLimit(key, limit, windowMs, now);
  }
}
