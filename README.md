# Tickd

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A shared daily checklist for your group. Tick your list, watch the wall fill in, don't be the one
with the gap.

This is the production build of the "Daily Challenge Tracker" prototype designed in Claude Design.
The original prototype and its design chat transcript live under [`design/`](./design) for
reference; nothing in that folder ships in the app.

## Stack

- **Next.js 16** (App Router, Turbopack, typed routes) on **React 19**
- **Postgres** via **Drizzle ORM** (works with Neon, Supabase, or Vercel's Postgres marketplace
  integration - anything that hands you a connection string)
- **Auth.js v5**, in one of two modes (`AUTH0_ENABLED`, off by default): a frictionless
  name-only **guest join** (no password/email/OAuth), or an **Auth0** application where any
  unauthenticated visit to a protected route redirects straight to Auth0's hosted Universal
  Login - no in-app sign-in screen either way
- **Tailwind CSS v4**, with the prototype's color/spacing/font tokens ported into `globals.css`
- **@dnd-kit** for the checklist drag-to-reorder interaction
- **next/og** (`ImageResponse`) for the personal share card, generated server-side as a PNG
- **Vercel Analytics** and **Speed Insights**, plus **Sentry** for client/server error tracking
  (optional - see [Error tracking](#error-tracking))
- **Upstash Redis**, backing the remote cache handler (see [Caching and rendering](#caching-and-rendering))
- **Vitest** + **Testing Library** for unit and component tests
- **Husky** + **lint-staged** + **commitlint** + **Prettier** + **ESLint** (flat config)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # at minimum, fill in DATABASE_URL - guest mode needs nothing else
pnpm run db:migrate           # applies drizzle/*.sql to your database
pnpm run db:seed              # optional: seeds one sample group with 15 members
pnpm run dev
```

### Auth0 setup (optional)

Skip this entirely for local dev - with `AUTH0_ENABLED` unset (or `"false"`), visitors instead
pick a display name to join, no account required, which is the default and what `pnpm run dev`
gives you out of the box.

To require real sign-in instead, set `AUTH0_ENABLED="true"` and create a Regular Web Application
in Auth0, enabling whichever connections you want offered on its hosted Universal Login page
(Google, email/password, passwordless, etc.) - the app itself renders no sign-in UI, so there's no
`connection` field to wire up on our side.

Set:

- **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback/auth0`
- **Allowed Logout URLs**: `http://localhost:3000`

(plus your production URL once deployed), then copy the domain, client ID, and client secret into
`.env.local`. Signing out ([sign-out-button.tsx](src/components/account/sign-out-button.tsx)) ends
both the app's session and the Auth0 hosted session via `/v2/logout`, so the logout URL has to be
allow-listed too or Auth0 will refuse the redirect back.

## Project structure

```
src/
  app/                  Routes (App Router). Thin: data fetching + composing components.
    g/[groupId]/        Everything scoped to one group (Today, Wall, Ranks, settings, profiles).
    api/                Auth.js handler and the share-card image route.
  components/           UI, grouped by feature (today/, wall/, settings/, account/, ...).
  server/
    db/                 Drizzle client, schema, migration runner.
    actions/            Server Actions - the only way the UI mutates data.
    queries/             Reads, memoized per request with React's `cache()`.
    auth/               Session helpers (require-user.ts).
    validation/         Zod schemas shared by every action's input.
  lib/                  Pure, framework-free helpers (date math, streaks, class names).
  types/                Shared TypeScript types for domain data.
drizzle/                Generated SQL migrations - commit these, don't hand-edit.
scripts/seed.ts         Sample data generator.
design/                 The original prototype and design chat transcript. Read-only reference.
```

## Caching and rendering

Every screen past the landing page is per-user, live data (your group, your ticks) - there isn't
much here that benefits from time-based caching, and caching it anyway would mean occasionally
showing someone a stale streak. The choices actually made:

- **Cache Components (`cacheComponents: true` in `next.config.ts`)** is on project-wide, adopted
  incrementally - every route under `/g/[groupId]` currently opts out (an `instant = false` export,
  see the comment on each one) until it's converted to a proper static-shell/dynamic-hole split.
  `/create`, `/join`, and a few others don't need the opt-out and already get Next's normal
  build-time prerendering.
- **`React.cache()`** wraps every read in `src/server/queries/` (and the session lookup in
  `src/server/auth/require-user.ts`), so a group navigation shares one DB round trip and one
  session decrypt across the layout and the page it wraps, instead of paying for each twice.
- **`"use cache: remote"`** scopes the group-wide data that's identical for every viewer -
  `getGroupCore` in `group-snapshot.ts` and the raw rows behind `getMyGroups` - behind a short-TTL
  cache (`cacheLife({ stale: 5, revalidate: 2, expire: 30 })`) shared across requests and
  serverless instances via Upstash Redis (`cache-handlers/redis-remote.js`; falls back to an
  in-memory Map when Redis isn't configured, which is fine for local dev/CI but means **the
  cross-instance sharing this exists for doesn't happen in production without
  `KV_REST_API_URL`/`KV_REST_API_TOKEN` set** - see Deploying). Anything viewer-specific or
  clock-dependent (today's date, `isMe`) is computed fresh outside the cached scope on every
  request.
- **The Today page streams**: the checklist and member-list sections are separate async Server
  Components behind their own `<Suspense>` boundaries (`(tabs)/today-checklist-section.tsx`,
  `member-list-section.tsx`), so the header/stats shell can paint before the heavier per-member
  computation finishes, without any client-side fetching.
- **The share-card image** (`/api/share/[groupId]`) is deliberately _not_ cached: it renders the
  requesting user's exact current tick state, and a cached PNG would go stale the moment they check
  another box.
- **Mutations** (`toggleCheck`, `reorderChecklistItems`, and so on) call `revalidatePath` and/or
  `updateTag` (`group:${groupId}`, `my-groups:${userId}`) so the group subtree and switcher list
  pick up fresh data on the next navigation without a manual refetch.

## Performance notes

- Fonts load through `next/font/google` (self-hosted, no layout shift, `display: swap`).
- The two drag-and-drop checklist editors are behind `next/dynamic`, so `@dnd-kit` ships as its own
  chunk instead of bloating every page's initial bundle.
- The Today checklist uses `useOptimistic` so a tick feels instant while the server action settles.
- `typedRoutes` is on, so a typo'd `href` is a build-time error, not a 404 in production.

## Testing and quality gates

```bash
pnpm run lint          # ESLint (flat config), including a 300-line cap per source file
pnpm run typecheck     # tsc --noEmit
pnpm run test          # Vitest (unit and component tests)
pnpm run test:coverage # Vitest with the coverage report below
pnpm run format:check  # Prettier
```

`pnpm run lint` enforces a 300-line maximum on non-test files and 500 lines on test files
(`eslint.config.mjs`) - split a file that grows past that rather than disabling the rule. Husky
runs `lint-staged` on every commit (ESLint + Prettier on staged files) and `commitlint` on every
commit message, which must follow [Conventional Commits](https://www.conventionalcommits.org/)
(`commitlint.config.js`).

### Unit and component tests

`pnpm run test` (Vitest) covers the framework-free logic layer (`src/lib`, `src/server/validation`)
plus the handful of components that carry real logic of their own - optimistic state, confirm
flows, sorting, derived class names - rather than just composing other components:
`checklist-draft-editor`, `checklist-settings-editor`, `danger-zone`, `invite-code-panel`,
`members-settings-list`, `today-checklist`, `theme-toggle`, and `wall-grid`. Purely presentational
components (`Button`, `Avatar`, `Pill`, `Sheet`, ...), server actions, route handlers, and page
components are exercised by the end-to-end suite instead, which drives them against a real
database and a real browser - unit-testing them a second time in isolation would just mean
maintaining two tests per behaviour. `vitest.config.ts`'s coverage `include` list is intentionally
scoped to that same set of files, with thresholds (80% statements/functions/lines, 75% branches)
enforced in CI.

## End-to-end tests

```bash
pnpm exec playwright install chromium   # once, if you don't already have a Chromium build
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/tickd_test pnpm run test:e2e
```

The suite (`tests/e2e/`) drives a real, running build of the app in a real browser against a real
Postgres database - nothing is mocked at the React or fetch layer. Two things stand in for
services this app doesn't own outright:

- **A scratch Postgres database.** `tests/e2e/global-setup.ts` runs every migration against
  `DATABASE_URL` before the suite starts and truncates all tables. Point it at any throwaway
  Postgres 16 instance (a local install, `docker run -p 5432:5432 postgres:16`, or the `postgres`
  service container CI uses) - never a database with data you care about, since it gets wiped.
  Each spec then seeds its own fresh group and users directly via Drizzle
  (`tests/e2e/fixtures/db.ts`), so specs are isolated from each other and safe to run in parallel.
- **A fake Auth0 server** (`tests/e2e/fixtures/fake-auth0-server.ts`), started automatically by
  Playwright alongside the app. It implements the OIDC discovery document and a stub `/authorize`
  and `/v2/logout`, so the suite can assert that unauthenticated visits and sign-out both really
  redirect to Auth0's hosted login/logout endpoints - without a real Auth0 tenant. For every
  authenticated screen, tests skip that redirect and mint a valid Auth.js session cookie directly
  (`tests/e2e/fixtures/auth-session.ts`), the way the Auth.js docs themselves recommend testing
  authenticated routes.

Coverage: the landing page (signed in and out), unauthenticated routes redirecting straight to
Auth0's hosted login, account settings, sign-out ending the Auth0 session too, creating a group
(including checklist editing and keyboard-driven drag-to-reorder), joining a group, the Today
dashboard (ticking, the streak ring, group/personal totals, the member list, the group switcher,
the share-card image, the bottom nav, the theme toggle), the wall, standings and its filters,
member profiles, and group settings (invite code, checklist CRUD and reordering, removing a
member, and archiving/deleting with its confirmation step).

Run `pnpm exec playwright show-report` after a run to open the HTML report, or `pnpm run test:e2e:ui` for
Playwright's interactive UI mode while writing new tests.

## Accessibility tests

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/tickd_test pnpm run test:a11y
```

`tests/e2e/a11y.spec.ts` runs an automated [axe-core](https://github.com/dequelabs/axe-core) scan
(via `@axe-core/playwright`) against one representative page per screen, both signed out and
signed in, checking WCAG 2.0/2.1 A and AA rules. It shares the same app server, fake Auth0 server,
and database fixtures as the end-to-end suite, just as a separate Playwright project
(`playwright.config.ts`'s `a11y` project) so it can be run and reported on independently. A failure
prints the axe rule id, impact, and every offending element so it is actionable without opening the
HTML report - though `pnpm run test:e2e:report` still works for either project.

This is a floor, not a ceiling: axe catches structural, contrast, and ARIA issues automatically,
but it cannot replace a manual keyboard-only pass or a real screen reader.

## CI

Two workflows run in GitHub Actions:

- **`.github/workflows/ci.yml`** runs on every push to `main`: format check, lint, typecheck, unit
  tests, build, then the full end-to-end and accessibility suites against a Postgres service
  container.
- **`.github/workflows/pr-quality.yml`** runs on every pull request into `main` and is the gate for
  merging. Unit tests (with coverage), end-to-end tests, and accessibility tests each run as their
  own job, so one suite failing doesn't hide the others' results. A final job downloads all three
  suites' JSON results and posts (or updates, on subsequent pushes) a single PR comment built by
  `scripts/ci/build-pr-comment.mjs` - one table per suite, each row a test name with a pass/fail
  mark, plus the unit-test table's per-metric coverage percentages and an overall pass/fail line per
  suite. The workflow job itself fails if any of the three suites failed, even though the comment
  posts either way.

> **Known issue:** `pr-quality.yml` has been failing on every PR regardless of content (each run
> finishes in a couple of seconds, too fast to have actually run a suite - almost certainly a setup
> step, e.g. `pnpm install --frozen-lockfile` against a stale lockfile). It's not gating anything
> right now; worth fixing before relying on it again.

## Deploying

The app is a standard Next.js project, deployable to Vercel. Required environment variables:

- `DATABASE_URL`
- `AUTH_SECRET` (generate with `npx auth secret`)
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_ISSUER` - only if `AUTH0_ENABLED="true"`

No app-URL variable to set on Vercel: `src/lib/base-url.ts` derives the app's own origin from
Vercel's system env vars (production domain if attached, else the deployment's own `*.vercel.app`
URL) when `NEXT_PUBLIC_APP_URL` isn't set, so it's correct on production and on every preview
deployment automatically. Set `NEXT_PUBLIC_APP_URL` explicitly only if deploying somewhere other
than Vercel.

Strongly recommended in production, though the app degrades gracefully without them:

- `KV_REST_API_URL`/`KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) -
  the Upstash Redis credentials the `"use cache: remote"` handler needs for its cross-instance
  sharing (see [Caching and rendering](#caching-and-rendering)). Without these, every serverless
  instance falls back to its own in-memory cache, so the cache exists but stops doing its actual
  job of sharing one lookup across instances/requests.
- **Match your compute region to your database's region.** Vercel's default function region and
  your Postgres provider's region are independent settings - a mismatch (e.g. a US Vercel region
  against an ap-southeast-1 Supabase project) adds a real cross-region round trip to _every_
  uncached query, easily 200ms+ round-trip depending on the pair, dwarfing anything else in the
  request. Set it in Vercel's dashboard under Project Settings → Functions → Function Region, or
  `regions` in `vercel.json`.

See [`.env.example`](.env.example) for the complete list including optional push notifications
(`VAPID_*`) and error tracking (`SENTRY_*`, see below).

`vercel.json` overrides the Vercel build command to `pnpm run db:migrate && pnpm run build`, so
every deploy applies any pending `drizzle/*.sql` migrations to `DATABASE_URL` before building -
there's no separate manual step. (This only changes Vercel's own build command; CI and local
`pnpm run build` are unaffected, since drizzle's migrator tracks applied migrations and no-ops
when there's nothing new to run.) Deploying elsewhere (not Vercel), run `pnpm run db:migrate`
against the target database as part of your own release step.

### Notification cron

`src/app/api/cron/evening-nudge` and `.../weekly-recap` need to run **hourly** (each request
filters to whoever's own local hour matches its target - see the routes' own comments), which
rules out Vercel's own Cron feature on the Hobby plan (once-a-day only there) and GitHub Actions
(kept free for CI). Instead, both routes are triggered by an [Upstash
QStash](https://upstash.com/docs/qstash) schedule - you likely already have an Upstash account for
`KV_REST_API_URL`/`KV_REST_API_TOKEN`; QStash is a separate free-tier product under the same
account.

The routes verify who's calling them via `src/server/cron-auth.ts`'s `withCronAuth`: when
`QSTASH_CURRENT_SIGNING_KEY` is set it verifies QStash's own cryptographic request signature (via
the `@upstash/qstash` SDK's `verifySignatureAppRouter` - no static secret in a header to leak,
keys rotate from the Upstash console); otherwise it falls back to a plain `CRON_SECRET` bearer
check, which is what keeps these routes hittable with a bare `curl` locally and in CI, where
there's no real QStash signature to produce. Use signature verification in production.

One-time setup, once the app is deployed:

1. In the [Upstash console](https://console.upstash.com/qstash), grab a `QSTASH_TOKEN` (for
   creating the schedule below) and the `QSTASH_CURRENT_SIGNING_KEY` /
   `QSTASH_NEXT_SIGNING_KEY` pair (for the routes to verify with) - all three under the QStash
   project's "Request Builder" / signing keys page. Set the two signing keys as env vars on the
   Vercel project.
2. Create a schedule for each route. Both routes only implement `GET`, so `Upstash-Method`
   overrides QStash's default of `POST`:

   ```bash
   curl -X POST "https://qstash.upstash.io/v2/schedules/https://YOUR_APP_URL/api/cron/evening-nudge" \
     -H "Authorization: Bearer $QSTASH_TOKEN" \
     -H "Upstash-Cron: 0 * * * *" \
     -H "Upstash-Method: GET"

   curl -X POST "https://qstash.upstash.io/v2/schedules/https://YOUR_APP_URL/api/cron/weekly-recap" \
     -H "Authorization: Bearer $QSTASH_TOKEN" \
     -H "Upstash-Cron: 0 * * * *" \
     -H "Upstash-Method: GET"
   ```

3. Confirm both show up under Schedules in the QStash console, and check the Logs tab there after
   the next run for a 200 from each.

No app code depends on QStash specifically beyond the signature check itself - swapping to a
different scheduler later just means it falls back to the `CRON_SECRET` bearer check instead.

### Error tracking

[Sentry](https://sentry.io) (`@sentry/nextjs`) covers what Vercel's own Observability can't: a
crash in the _browser_ (a render error, a click handler throwing, a failed client-side fetch) -
Vercel's runtime logs only ever see server-side (serverless/edge function) errors.

- `src/instrumentation.ts` / `src/instrumentation-client.ts` - server/edge and browser
  `Sentry.init()`, both no-op cleanly when `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are unset, so
  Sentry is entirely optional and the app runs identically without it.
- `src/app/error.tsx` - the on-brand, app-wide error boundary (catches anything under the root
  layout without a closer `error.tsx` of its own).
- `src/app/global-error.tsx` - Next's required last-resort boundary for the rare case the root
  layout itself throws; deliberately minimal since it can't assume anything else in the app is
  intact.

Setup: create a Sentry project (platform Next.js), then set `SENTRY_DSN` and
`NEXT_PUBLIC_SENTRY_DSN` to its DSN (Settings → Client Keys). For readable stack traces, also set
`SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens, scoped to
`project:releases`) - `next.config.ts`'s `withSentryConfig` uploads source maps at build time only
when all three are present, and is silent otherwise.

## Product notes and intentional deviations from the prototype

- **Accounts are real**, so the join flow no longer re-asks for a name and color the way the
  prototype did - both live on `/account` and carry over to every group.
- **Per-item completion percentages on a member's profile are computed from real check history**,
  not the prototype's random placeholder values.
- **The invite link's copy-to-clipboard text is derived from `getBaseUrl()`** (`src/lib/base-url.ts`,
  the same helper `metadataBase` uses in `src/app/layout.tsx`), not a hardcoded domain - it always
  matches wherever the app is actually being served, in every environment, with no env var to keep
  in sync.

## Contributing

Bug reports, feature requests, and pull requests are welcome. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for local setup, code style, and what CI expects before you
open a PR, and the [wiki](https://github.com/akhiakl/tickd/wiki) for deeper architecture notes.
This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Found a security issue?
Please report it privately - see [`SECURITY.md`](./SECURITY.md).

## License

[MIT](./LICENSE)
