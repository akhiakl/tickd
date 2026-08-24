import "server-only";
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

type Handler = (request: Request) => Promise<Response>;

/**
 * Wraps a cron route handler so it only runs for a genuine call from
 * Upstash QStash (see README's "Notification cron" section for how the
 * schedule is set up) - the thing that actually calls these routes hourly
 * in production.
 *
 * Prefers QStash's own signature verification (`verifySignatureAppRouter`,
 * checking the `Upstash-Signature` header against `QSTASH_CURRENT_SIGNING_KEY`
 * / `QSTASH_NEXT_SIGNING_KEY` from the Upstash console) whenever those keys
 * are configured - cryptographic, tied to Upstash's own rotating keys, no
 * static secret that could leak from a header or a log. Falls back to the
 * plain `CRON_SECRET` bearer check when they're not, which is what keeps
 * these routes hittable with a bare `curl` locally and in CI, where
 * there's no real QStash signature to produce.
 */
export function withCronAuth(handler: Handler): Handler {
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    return verifySignatureAppRouter(handler) as Handler;
  }

  return async (request: Request) => {
    const secret = process.env.CRON_SECRET;
    if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return handler(request);
  };
}
