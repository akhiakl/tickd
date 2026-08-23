import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (component/function-level `use cache`, PPR by
  // default). Adopted incrementally: every route currently opts out via
  // `instant = false` (see the codemod that added those) until it's
  // converted one at a time - see the migration notes in AGENTS.md/PRs
  // for the running list of which routes are done.
  cacheComponents: true,
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

export default nextConfig;
