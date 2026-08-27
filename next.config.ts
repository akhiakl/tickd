import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Cache Components (component/function-level `use cache`, PPR by
  // default). Adopted incrementally: every route currently opts out via
  // `instant = false` (see the codemod that added those) until it's
  // converted one at a time - see the migration notes in AGENTS.md/PRs
  // for the running list of which routes are done.
  cacheComponents: true,
  // 'use cache: remote' scopes (per-group data in
  // src/server/queries/group-snapshot.ts) go through Redis instead of the
  // default in-memory handler - serverless instances don't share memory,
  // so without this every instance would re-run the underlying query on
  // its own. See cache-handlers/redis-remote.js for the fallback behavior
  // when Redis isn't configured (local dev, tests, CI).
  cacheHandlers: {
    remote: require.resolve("./cache-handlers/redis-remote.js"),
  },
  // Statically typed <Link href> and route params across the app.
  typedRoutes: true,
  // The Playwright suite drives the dev server over plain 127.0.0.1 rather
  // than localhost; without this, Next 16's dev-origin check silently
  // drops dynamic-import chunk requests (e.g. the drag-and-drop editors)
  // from that origin. No effect on production builds.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Avatars are drawn as inline SVG/CSS, not remote images, so no
    // remotePatterns are needed today. Add providers here if that changes.
    formats: ["image/avif", "image/webp"],
  },
};

export default withSentryConfig(nextConfig, {
  // Only used to upload source maps at build time - all optional and only
  // active when set, so this stays a no-op until SENTRY_AUTH_TOKEN exists
  // (in CI/Vercel; never needed locally). org/project come from the
  // Sentry project you create - fill in once you have them.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Quiets Sentry's own build-time logging when the token isn't set
  // (every build until the project exists) instead of warning on each one.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Keeps stack traces readable in Sentry without shipping the source
  // maps themselves to the client.
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Routes client-side Sentry requests through this app's own domain
  // (avoids ad-blockers dropping requests to sentry.io directly). Costs a
  // few extra bytes of middleware; fine for this app's traffic.
  tunnelRoute: "/monitoring",
});
