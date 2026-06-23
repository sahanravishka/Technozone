import 'server-only';
import { headers } from 'next/headers';

// Fixed-window rate limiter backed by Upstash Redis REST (no SDK needed).
// Fails OPEN when unconfigured or unreachable, so it never blocks real
// customers in dev / during an outage — set UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN to activate it in production.

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** Best-effort client IP from proxy headers. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

/**
 * Returns true if the call is allowed. `limit` requests per `windowSec`,
 * keyed by action + identifier (usually the client IP).
 */
export async function rateLimit(
  action: string,
  id: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  if (!REST_URL || !REST_TOKEN) return true; // not configured -> no-op
  const key = `rl:${action}:${id}`;
  try {
    const res = await fetch(`${REST_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      // INCR the counter, then set the window TTL only on first hit (NX).
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSec, 'NX']
      ]),
      cache: 'no-store'
    });
    if (!res.ok) return true; // limiter unavailable -> fail open
    const data = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = Number(data?.[0]?.result ?? 0);
    return count <= limit;
  } catch {
    return true; // network error -> fail open
  }
}

/** Convenience: rate-limit the current request by client IP. */
export async function rateLimitByIp(action: string, limit: number, windowSec: number) {
  return rateLimit(action, await clientIp(), limit, windowSec);
}
