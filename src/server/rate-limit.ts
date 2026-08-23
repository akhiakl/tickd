import "server-only";
import { headers } from "next/headers";
import { Redis } from "@upstash/redis";

// Same env vars as cache-handlers/redis-remote.js - see that file's
// comment for why both names are accepted (Vercel's "Upstash for Redis"
// Marketplace integration has shipped under both).
const restUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = restUrl && restToken ? new Redis({ url: restUrl, token: restToken }) : null;

/**
 * Fixed-window rate limit, shared across every serverless instance via
 * Redis (an in-memory counter would reset per-instance and be close to
 * meaningless on Vercel). Fails OPEN - allows the request - when Redis
 * isn't configured or the check itself errors: a rate limiter that can
 * take the whole app down when its backing store hiccups is a worse
 * outcome than one that's occasionally too permissive. This is
 * defense-in-depth layered on top of Vercel's own bot protection, not the
 * only thing standing between the app and abuse.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!redis) return true;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch {
    return true;
  }
}

/** Best-effort client IP from the headers Vercel's edge network sets.
 * Falls back to a constant so a missing header degrades to "everyone
 * shares one bucket" rather than throwing. */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}
