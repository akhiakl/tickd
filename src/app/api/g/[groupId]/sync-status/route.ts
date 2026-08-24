import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { auth } from "@/auth";
import { requireMembership } from "@/server/actions/checklist";
import { rateLimit } from "@/server/rate-limit";

// Same env vars/pattern as cache-handlers/redis-remote.js and
// src/server/rate-limit.ts - see either's comment for why both names are
// accepted (Vercel's "Upstash for Redis" Marketplace integration has
// shipped under both).
const restUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const restToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = restUrl && restToken ? new Redis({ url: restUrl, token: restToken }) : null;

/**
 * Phase 3 (docs/local-first-sync-engine-plan.md) - the actual mechanism
 * behind "a groupmate's tick shows up without a manual reload," given
 * this app's REST-only Redis client and serverless hosting rule out a
 * persistent SSE + pub/sub connection (see the plan's Phase 3 section for
 * the full reasoning): the client polls this endpoint and compares
 * `updatedAt` against its own last-seen value.
 *
 * Deliberately reuses existing infrastructure rather than adding a new
 * write path: `updatedAt` is the same `tag:group:<id>` timestamp
 * cache-handlers/redis-remote.js already writes on every `updateTag` call
 * - which every checklist mutation already makes, via `refreshGroup` in
 * src/server/actions/checklist.ts, to invalidate `getGroupCore`'s shared
 * cache. This endpoint doesn't know or care *what* changed, only *that*
 * something did - the client's response to a changed timestamp is a full
 * `router.refresh()`, which re-runs the normal (already cache-aware)
 * server render.
 *
 * When Redis isn't configured (local dev/CI - see redis-remote.js's own
 * comment), `updatedAt` is always 0: polling never observes a change, so
 * this fails closed to "no live updates" rather than to an error.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  // Generous relative to the client's own ~15s poll cadence - this is a
  // safety net against a runaway/misbehaving tab, not a tight budget a
  // normal client could ever bump into (see src/server/rate-limit.ts's
  // own comment: fails open, since a rate limiter blocking real usage
  // when Redis hiccups is worse than one that's occasionally permissive).
  const withinLimit = await rateLimit(`sync-status:${userId}`, 30, 10);
  if (!withinLimit) return new NextResponse("Too many requests", { status: 429 });

  try {
    await requireMembership(groupId, userId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const raw = redis ? await redis.get(`tag:group:${groupId}`) : null;
  const updatedAt = Number(raw) || 0;
  return NextResponse.json({ updatedAt });
}
