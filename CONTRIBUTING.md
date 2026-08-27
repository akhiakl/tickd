# Contributing to tickd

Thanks for taking the time to contribute. This doc covers everything you need to get a change
from your machine into `main`.

## Getting set up

Follow the [Getting started](./README.md#getting-started) section of the README - package manager,
env vars, migrations, seed data. The short version:

```bash
pnpm install
cp .env.example .env.local   # DATABASE_URL is the only required var - guest mode needs nothing else
pnpm run db:migrate
pnpm run dev
```

**Use pnpm.** This repo pins `packageManager` in `package.json` and its lockfile, and `npm install`
resolves a different (incompatible) dependency tree - see the note in [`AGENTS.md`](./AGENTS.md) if
you hit a confusing `TS2305` on a test file after using the wrong package manager.

## Before opening a PR

Run the same four checks CI expects, all four are in the PR template's checklist:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

If your change touches `src/server/db/schema`, also generate and run a migration:

```bash
pnpm run db:generate
pnpm run db:migrate
```

commit the generated file(s) under `drizzle/` alongside your schema change - never hand-edit
generated SQL.

## Commit messages

Commits are enforced by a `commit-msg` hook (`commitlint` +
[Conventional Commits](https://www.conventionalcommits.org/)): `type: subject`, e.g. `feat:`,
`fix:`, `perf:`, `docs:`, `chore:`, `test:`, `refactor:`. A commit that doesn't match this format
is rejected locally, not just in CI.

A `pre-commit` hook also runs `lint-staged` (ESLint --fix + Prettier on staged source files,
Prettier on staged JSON/Markdown/CSS/YAML) - it's normal for a commit to come back with a few
extra staged changes beyond what you wrote by hand.

## Code style

- **300-line cap** on non-test source files, 500 on test files (`eslint.config.mjs`) - split a file
  that grows past that rather than disabling the rule.
- Server Actions (`src/server/actions/`) are the only way the UI mutates data; reads go through
  `src/server/queries/`, each wrapped in React's `cache()`.
- Validation schemas are shared between the client and server via `src/server/validation/` - add to
  or reuse those rather than re-validating ad hoc.
- No new em dashes in copy, comments, or docs - use a spaced hyphen or rewrite the sentence.

## Testing expectations

- **Unit/component** (`pnpm run test`, Vitest): scoped to framework-free logic (`src/lib`,
  validation schemas) and the handful of components with real state of their own. Most components
  are integration-tested by Playwright instead - don't add unit coverage for purely presentational
  components; add or extend an e2e spec instead.
- **E2E** (`pnpm run test:e2e` for guest mode, `pnpm run test:e2e:auth0` for Auth0 hosted-login
  mode): drives a real build against a real Postgres database and a real browser. New
  user-facing behavior should get e2e coverage here, not a mocked unit test.

See the [README's testing section](./README.md#testing-and-quality-gates) for the full breakdown,
and `.claude/skills/local-production-verify/SKILL.md` for verifying a change against a real
production build instead of `next dev`.

## Opening a PR

- Branch off `main`.
- Fill in the PR template - summary, changes, how to test, and the checklist above.
- Keep PRs focused: one logical change per PR is easier to review and easier to revert if
  something goes wrong.
- Link any issue the PR addresses.

## Reporting bugs / requesting features

Use the issue templates - they ask for the context that's usually needed to act on a report
(repro steps, expected vs. actual, environment) so a first response doesn't have to start by
asking for it.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By participating, you're
expected to uphold it.

## Security

Found a security issue? Please don't open a public issue - see [`SECURITY.md`](./SECURITY.md) for
how to report it privately.
