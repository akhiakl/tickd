---
name: local-production-verify
description: Stand up tickd against a real local Postgres and a real production build (not `next dev`) to verify a change, measure timing, or confirm something the dev server's fast-refresh/caching would mask. Use whenever a task needs "does this actually work end to end" evidence rather than a code-reading argument - performance investigations, cache-behavior changes, auth/session changes, or anything touching `next.config.ts`.
---

# Verifying tickd against a real local Postgres + production build

This is the setup used to actually measure and verify changes (not just read code) - a local
Postgres, `next build`/`next start` (not `next dev`, which has compile-on-demand overhead that
skews timing and hides some Cache Components behavior), and a real authenticated session via curl,
no browser needed.

## 1. Get Postgres running

```bash
service postgresql status   # usually "down" in a fresh container
service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE tickd;"   # skip if it already exists
```

## 2. `.env.local`

```bash
cat > .env.local <<'EOF'
DATABASE_URL="postgres://postgres:postgres@localhost:5432/tickd"
AUTH_SECRET="local-dev-secret-not-for-prod-0000000000000000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH0_ENABLED="false"
AUTH_TRUST_HOST=true
EOF
```

`AUTH_TRUST_HOST=true` is the one that's easy to miss: `next dev` auto-trusts localhost, but
`next start` (production mode) doesn't, and Auth.js throws `UntrustedHost` on the first request
without it.

## 3. Dependencies, migrate, seed

**Always `pnpm install` here, never `npm install` (with or without `--legacy-peer-deps`).** This
repo's lockfile is pnpm's; an npm-created `node_modules` resolves a different
`@testing-library/react` version than the lockfile pins, which then fails `tsc --noEmit` on every
`*.test.tsx` file with `TS2305` - a real, confusing, and entirely self-inflicted failure that looks
like a repo problem but isn't. If you've already done this by mistake: `rm -rf node_modules && pnpm
install` fixes it completely.

```bash
pnpm install
set -a && source .env.local && set +a && npx tsx src/server/db/migrate.ts
set -a && source .env.local && set +a && npx tsx scripts/seed.ts   # optional: 15-member sample group
```

(`tsx` scripts don't auto-load `.env.local` the way Next itself does - the `source` is required.)

## 4. Build and start (production mode)

```bash
rm -rf .next
set -a && source .env.local && set +a && npx next build
set -a && source .env.local && set +a && PORT=3000 nohup npx next start > /tmp/nextstart.log 2>&1 &
disown
sleep 3
```

## 5. Get an authenticated session without a browser

Guest sign-in is a NextAuth Credentials provider, so it needs a CSRF token first:

```bash
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt "http://localhost:3000/api/auth/csrf" -o /tmp/csrf.json
TOKEN=$(node -e "console.log(require('/tmp/csrf.json').csrfToken)")
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X POST "http://localhost:3000/api/auth/callback/guest" \
  --data-urlencode "name=Tester" \
  --data-urlencode "csrfToken=$TOKEN" \
  --data-urlencode "json=true"
```

`/tmp/cookies.txt` now holds a real session cookie - `curl -b /tmp/cookies.txt <url>` from here on
hits any authenticated route exactly like a signed-in browser would. To join/create a group without
scripting the join form, insert membership rows directly:

```sql
insert into group_members (group_id, user_id, role) values ('<groupId>', '<userId>', 'member');
```

(`select id from users order by created_at desc limit 1;` gets the guest's own user id.)

## Gotchas specific to this codebase

- **Cache Components (`cacheComponents: true`) rejects `export const dynamic = "..."` route
  segment config** - Turbopack fails the build with "Route segment config `dynamic` is not
  compatible with `nextConfig.cacheComponents`". To force a route/page dynamic for testing (e.g. so
  a route handler actually re-executes per request instead of getting static-optimized), use
  `await connection()` from `next/server` instead.
- **Timing measurements only mean something when the DB/cache round trips are real.** A local
  Postgres has sub-millisecond network latency and no real Redis (the `"use cache: remote"` handler
  falls back to an in-memory Map - see `cache-handlers/redis-remote.js`), both far faster than
  production's actual Vercel↔hosted-Postgres/Redis round trips. Report local numbers as relative
  proportions and confirmed logic, not as production-equivalent absolute latency.
- **`instrumentation.ts`/`instrumentation-client.ts` (Sentry) no-op cleanly with no DSN set** - safe
  to leave `SENTRY_DSN` unset for this whole flow; nothing errors, nothing sends.

## Cleanup

```bash
pkill -9 -f "next-server"
rm -rf .next .env.local
service postgresql stop
```

Never commit `.env.local`, or a real DSN/credential typed directly into a script or test route -
this whole flow exists precisely so nothing like that needs to touch a committed file.
