# Tickd

A shared daily checklist for your group. Tick your list, watch the wall fill in, don't be the one
with the gap.

This is the production build of the "Daily Challenge Tracker" prototype designed in Claude Design.
The original prototype and its design chat transcript live under [`design/`](./design) for
reference; nothing in that folder ships in the app.

## Stack

- **Next.js 16** (App Router, Turbopack, typed routes) on **React 19**
- **Postgres** via **Drizzle ORM** (works with Neon, Supabase, or Vercel's Postgres marketplace
  integration - anything that hands you a connection string)
- **Auth.js v5** with an **Auth0** application: any unauthenticated visit to a protected route
  redirects straight to Auth0's hosted Universal Login - no in-app sign-in screen
- **Tailwind CSS v4**, with the prototype's color/spacing/font tokens ported into `globals.css`
- **@dnd-kit** for the checklist drag-to-reorder interaction
- **next/og** (`ImageResponse`) for the personal share card, generated server-side as a PNG
- **Vercel Analytics** and **Speed Insights**
- **Vitest** + **Testing Library** for unit and component tests
- **Husky** + **lint-staged** + **commitlint** + **Prettier** + **ESLint** (flat config)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL and the AUTH0_* values
pnpm run db:migrate           # applies drizzle/*.sql to your database
pnpm run db:seed              # optional: seeds one sample group with 15 members
pnpm run dev
```

### Auth0 setup

Create a Regular Web Application in Auth0 and enable whichever connections you want offered on its
hosted Universal Login page (Google, email/password, passwordless, etc.) - the app itself renders
no sign-in UI, so there's no `connection` field to wire up on our side.

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

- **`React.cache()`** wraps every read in `src/server/queries/`, so the group layout and the page it
  wraps share one database round trip per request instead of two.
- **Route segment defaults are left on `auto`.** Next's own heuristic already prerenders what it
  can - `/create`, for instance, has no per-request data dependency and comes out of `next build`
  as a static route with no configuration from us.
- **The share-card image** (`/api/share/[groupId]`) is deliberately _not_ cached: it renders the
  requesting user's exact current tick state, and a cached PNG would go stale the moment they check
  another box.
- **Mutations** (`toggleCheck`, `reorderChecklistItems`, and so on) call `revalidatePath` on the
  group's layout segment, so the whole group subtree picks up fresh data on the next navigation
  without a manual refetch.

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

## Deploying

The app is a standard Next.js project, deployable to Vercel with no extra configuration beyond
environment variables:

- `DATABASE_URL`
- `AUTH_SECRET` (generate with `npx auth secret`)
- `NEXT_PUBLIC_APP_URL` (your production origin)
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_ISSUER`

Run `pnpm run db:migrate` against the production database once before the first deploy.

## Product notes and intentional deviations from the prototype

- **Accounts are real**, so the join flow no longer re-asks for a name and color the way the
  prototype did - both live on `/account` and carry over to every group.
- **Per-item completion percentages on a member's profile are computed from real check history**,
  not the prototype's random placeholder values.
- **The invite link domain (`tickd.app`) is a placeholder** - swap it for your real domain once one
  exists; only the copy-to-clipboard text references it today, nothing routes through it.
