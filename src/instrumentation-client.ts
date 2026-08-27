import * as Sentry from "@sentry/nextjs";

/**
 * Browser half of Sentry's setup (see instrumentation.ts for the
 * server/edge half) - this is the piece that was actually missing before:
 * Vercel's own Observability only ever sees server-side errors, so a
 * crash in the browser (a render error, a click handler throwing, a
 * failed client-side fetch) had nowhere to go but that one visitor's
 * DevTools console. `NEXT_PUBLIC_SENTRY_DSN` (not the bare `SENTRY_DSN`
 * instrumentation.ts uses) because this file ships to the browser -
 * only NEXT_PUBLIC_* env vars get inlined into client bundles.
 *
 * No-ops cleanly when the DSN isn't set - safe to ship before a Sentry
 * project exists.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});

// Required by Next.js for navigation instrumentation (route-change spans);
// a no-op export otherwise.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
