/** Tiny in-memory sliding-window limiter for public write endpoints.
 *  This is per-process (best effort); put a shared limiter in front of the app
 *  when running more than one instance. */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
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
