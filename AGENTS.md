<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# tickd - repo conventions for AI agents

Everything below this line is hand-maintained (not regenerated) - keep it updated as conventions
change, same as any other doc.

## Package manager: pnpm only

`packageManager: "pnpm@11.22.0"` in `package.json`, Node `>=22.22.2`. Never `npm install`, with or
without `--legacy-peer-deps` - npm's flat `node_modules` layout resolves a different
`@testing-library/react` version than the pnpm lockfile pins, which then fails `tsc --noEmit` on
every `*.test.tsx` file with a confusing `TS2305` that looks like a repo problem but isn't. If this
already happened: `rm -rf node_modules && pnpm install`.

## Commits: Conventional Commits, enforced

A `commit-msg` hook (`commitlint` + `@commitlint/config-conventional`) rejects any commit message
that isn't `type: subject` (`feat:`, `fix:`, `perf:`, `docs:`, `chore:`, `test:`, `refactor:`, ...).
A `pre-commit` hook also runs `lint-staged` - `eslint --fix` + `prettier --write` on staged
`*.{ts,tsx,js,jsx,mjs,cjs}` and `prettier --write` on staged `*.{json,md,css,yml,yaml}` - so a
commit can come back with additional staged changes beyond what you wrote; that's expected, not a
failure.

The PR template's checklist also asks for no new em dashes in copy or docs - written content in
this repo (README, comments, PR bodies) uses a spaced hyphen or a rewritten sentence instead.

## Cache Components (`cacheComponents: true` in `next.config.ts`)

- Route segment config's `export const dynamic = "..."` is rejected at build time ("not compatible
  with `nextConfig.cacheComponents`"). To force a route/handler dynamic, `await connection()` from
  `next/server` instead.
- Per-group data goes through `"use cache: remote"` (see `src/server/queries/`), backed by Upstash
  Redis in production (`cache-handlers/redis-remote.js`) so cached values are shared across
  serverless instances - it falls back to an in-memory `Map` when Redis isn't configured (local
  dev, tests, CI), which is fine for correctness but isn't a production-equivalent cache.
- Every route currently opts out of Cache Components' default behavior via `instant = false`
  pending incremental migration - check a route's own segment file before assuming it's converted.

## Base URL: don't hardcode or ask for a new env var

`src/lib/base-url.ts`'s `getBaseUrl()` is the one place that resolves the app's own origin - it
honors `NEXT_PUBLIC_APP_URL` if set (what the e2e suite uses to point at its own test server), else
derives it from Vercel's system env vars automatically. Use it rather than reading
`NEXT_PUBLIC_APP_URL`/`VERCEL_URL` directly or introducing another env var for the same thing.

## Testing

- Unit/component: `pnpm run test` (Vitest, jsdom). Coverage is scoped in `vitest.config.ts` to
  framework-free logic (`src/lib`, validation schemas) and the handful of components with real
  state of their own - most components are integration-tested by Playwright instead, not unit
  tested, so don't add coverage expectations for purely presentational components.
- E2E: `pnpm run test:e2e` (guest mode, matches production's default) and
  `pnpm run test:e2e:auth0` (Auth0 hosted-login mode - separate config because one running
  `next dev` process commits to one auth mode for its life). See
  `.claude/skills/local-production-verify/SKILL.md` for verifying against a real production build
  instead of `next dev`.
- Before pushing: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build` - all
  four are in the PR template's checklist and are what CI (when it's healthy - see the README's
  known-issue callout on `pr-quality.yml`) would otherwise catch.

## Error tracking

`src/instrumentation.ts` / `src/instrumentation-client.ts` (Sentry) no-op cleanly with no
`SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` set - safe to leave unset in any dev/test flow, nothing
errors and nothing sends.
