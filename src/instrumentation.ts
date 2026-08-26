import * as Sentry from "@sentry/nextjs";

/**
 * Runs once per server/edge runtime instance at startup (Next.js'
 * `instrumentation.ts` convention - see instrumentation-client.ts for the
 * browser half). `NEXT_RUNTIME` distinguishes the two server runtimes:
 * `nodejs` for serverless functions/route handlers, `edge` for
 * middleware/edge routes. Both share the same env vars, so one project
 * covers both without a runtime-specific DSN.
 *
 * No-ops cleanly when SENTRY_DSN isn't set (Sentry's own behavior) - safe
 * to ship before a Sentry project exists; it just stays inactive until the
 * env var is added.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      // Trace a small sample of requests rather than all of them - cheap
      // enough for a hobby-scale app, but keep an eye on volume if this
      // ever gets busier. Errors are always captured regardless of this.
      tracesSampleRate: 0.2,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.2,
    });
  }
}

/**
 * Wires Server Component / Server Action / Route Handler errors that Next
 * itself catches (and would otherwise only ever reach Vercel's own runtime
 * logs, per the group-detail perf investigation) into Sentry too.
 */
export const onRequestError = Sentry.captureRequestError;
