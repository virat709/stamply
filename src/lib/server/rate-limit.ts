import { logServerError } from "./http";

/** Rate limiting for public write endpoints.
 *
 *  On serverless platforms an in-memory counter is per-instance, which makes
 *  it nearly useless. When Upstash Redis REST credentials are present we use a
 *  shared fixed-window counter there; otherwise we fall back to the in-process
 *  map (local dev, single-instance self-hosting). Set:
 *    UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 */

interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const buckets = new Map<string, number[]>();

function memoryRateLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Keep the map from growing without bound under random-key abuse.
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) {
      if (!v.length || now - v[v.length - 1] >= windowMs) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

const REST_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisRateLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const redisKey = `ratelimit:${key}`;
  const headers = {
    Authorization: `Bearer ${REST_TOKEN}`,
    "Content-Type": "application/json",
  };
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers,
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PTTL", redisKey],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash rate limit failed: ${res.status}`);
  const data = (await res.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(data[0]?.result ?? 0);
  let ttl = Number(data[1]?.result ?? -1);

  // First hit in this window — start the expiry.
  if (count === 1 || ttl < 0) {
    await fetch(`${REST_URL}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, {
      method: "POST",
      headers,
      cache: "no-store",
    });
    ttl = windowMs;
  }

  if (count > limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  if (REST_URL && REST_TOKEN) {
    try {
      return await redisRateLimit(key, limit, windowMs);
    } catch (e) {
      // Never take the site down because the limiter is unreachable.
      logServerError("rate-limit", e);
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

/** Best-effort client IP. On Vercel `x-vercel-forwarded-for` is set by the
 *  platform and cannot be spoofed by the caller; a raw `x-forwarded-for` can,
 *  so it is only used as a last resort (last hop). */
export function clientIp(req: Request): string {
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",") ?? [];
  const last = forwarded[forwarded.length - 1]?.trim();
  return last || "local";
}
