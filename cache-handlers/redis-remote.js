/**
 * `'use cache: remote'` handler for Cache Components (see next.config.ts's
 * `cacheHandlers.remote`). Backed by Upstash Redis over its REST client
 * (fetch-based, no persistent TCP connection to manage or exhaust across
 * serverless invocations - a plain `redis`/`ioredis` client would need
 * connection pooling that doesn't fit Vercel's per-invocation model).
 *
 * Falls back to a per-instance in-memory Map when
 * UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN aren't set, so this file
 * is always safe to reference - local dev and CI never need Redis
 * configured, they just don't get the cross-instance sharing that's the
 * whole point of this handler in production.
 *
 * A plain CommonJS file, not TypeScript: cacheHandlers are loaded directly
 * by Next's config loader outside the app's own build/bundle, so it's kept
 * dependency-free of the rest of the app and mirrors the pattern in the
 * Next.js docs (Cache Handlers > External storage pattern) - see
 * https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers
 */
const { Redis } = require("@upstash/redis");

// Vercel's "Upstash for Redis" Marketplace integration (what "Vercel Redis"
// resolves to today - the standalone Vercel KV product was retired in
// favor of this) has injected env vars under both names depending on how
// and when the integration was added: KV_REST_API_* is the legacy Vercel
// KV naming, UPSTASH_REDIS_REST_* is Upstash's own. Accept either.
const restUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = restUrl && restToken ? new Redis({ url: restUrl, token: restToken }) : null;

/** Used only when Redis isn't configured - cleared on every cold start, which
 * is fine: it's a same-behavior-as-default-in-memory fallback, not a
 * durability guarantee. */
const memory = new Map();

async function readStreamAsBase64(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("base64");
}

function toReadableStream(base64) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from(base64, "base64"));
      controller.close();
    },
  });
}

module.exports = {
  async get(cacheKey) {
    const raw = redis ? await redis.get(cacheKey) : memory.get(cacheKey);
    if (!raw) return undefined;

    // The Upstash client auto-parses JSON values; the in-memory fallback
    // stores the object directly.
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (Date.now() > data.timestamp + data.revalidate * 1000) return undefined;

    return {
      value: toReadableStream(data.value),
      tags: data.tags,
      stale: data.stale,
      timestamp: data.timestamp,
      expire: data.expire,
      revalidate: data.revalidate,
    };
  },

  async set(cacheKey, pendingEntry) {
    const entry = await pendingEntry;
    const data = {
      value: await readStreamAsBase64(entry.value),
      tags: entry.tags,
      stale: entry.stale,
      timestamp: entry.timestamp,
      expire: entry.expire,
      revalidate: entry.revalidate,
    };

    if (redis) {
      // Redis TTL as a backstop past `expire`; `get()` above still enforces
      // the shorter `revalidate` window itself.
      await redis.set(cacheKey, JSON.stringify(data), { ex: Math.max(1, entry.expire) });
    } else {
      memory.set(cacheKey, data);
    }
  },

  async refreshTags() {
    // No-op: getExpiration() below reads tag timestamps straight from
    // Redis on every call rather than from a locally synced copy, so
    // there's no local tag state that needs refreshing between requests.
  },

  async getExpiration(tags) {
    if (tags.length === 0) return 0;
    const timestamps = redis
      ? await Promise.all(tags.map((tag) => redis.get(`tag:${tag}`)))
      : tags.map((tag) => memory.get(`tag:${tag}`));
    return Math.max(0, ...timestamps.map((value) => Number(value) || 0));
  },

  async updateTags(tags) {
    const now = Date.now();
    if (redis) {
      await Promise.all(tags.map((tag) => redis.set(`tag:${tag}`, now)));
    } else {
      for (const tag of tags) memory.set(`tag:${tag}`, now);
    }
  },
};
