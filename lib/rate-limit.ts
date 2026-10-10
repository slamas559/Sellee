import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

// ── Shared store (Upstash Redis) ─────────────────────────────────────────
// Counters live in Redis so every serverless instance sees the same numbers.
// Accepts either the Upstash names or the ones Vercel's Upstash integration sets.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(maxRequests: number, windowMs: number): Ratelimit {
  const id = `${maxRequests}:${windowMs}`;
  let limiter = limiters.get(id);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.fixedWindow(maxRequests, `${Math.ceil(windowMs / 1000)} s`),
      // Limit + window in the prefix so the same key used with different limits never collides.
      prefix: `sellee:rl:${id}`,
      analytics: false,
    });
    limiters.set(id, limiter);
  }
  return limiter;
}

// ── In-memory fallback ───────────────────────────────────────────────────
// Used for local development when Upstash isn't configured, and as a safety
// net if Redis is unreachable (we'd rather rate limit per-instance than lock
// everyone out, or let everything through, during an outage).
const store = globalThis as typeof globalThis & {
  __selleeRateLimitStore?: Map<string, Entry>;
};

const memoryStore = store.__selleeRateLimitStore ?? new Map<string, Entry>();
store.__selleeRateLimitStore = memoryStore;

function checkMemoryRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: maxRequests - 1,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
      remaining: 0,
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    remaining: maxRequests - existing.count,
  };
}

/**
 * Counts one request against `key`. Backed by Upstash Redis when configured,
 * otherwise per-instance memory. Always `await` this.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (redis) {
    try {
      const result = await getLimiter(maxRequests, windowMs).limit(key);
      return {
        allowed: result.success,
        retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        remaining: result.remaining,
      };
    } catch (error) {
      console.error("[rate-limit] Redis unavailable, using in-memory fallback", error);
    }
  }

  return checkMemoryRateLimit(key, maxRequests, windowMs);
}
