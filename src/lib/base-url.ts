/**
 * Resolves the app's own origin, preferring an explicit override and
 * otherwise deriving it automatically from Vercel's own system env vars -
 * no env var needs to be hand-maintained per environment on Vercel itself.
 *
 * - `NEXT_PUBLIC_APP_URL`, if set, always wins. This is what the e2e suite
 *   uses (see `tests/e2e/playwright.shared.ts`'s `baseURL`, pointed at the
 *   test server's own `127.0.0.1:<port>` rather than localhost:3000) and
 *   what a non-Vercel deployment should set explicitly, since the two
 *   fallbacks below only exist on Vercel.
 * - `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` - the project's stable
 *   production domain (custom domain if one's attached, else the
 *   `*.vercel.app` production URL). Preferred so links generated from a
 *   production deployment always point at the canonical domain.
 * - `NEXT_PUBLIC_VERCEL_URL` - the current deployment's own URL. Set on
 *   preview deployments too, so links generated from a preview point back
 *   at that same preview rather than production or localhost.
 *
 * The `NEXT_PUBLIC_` prefixes are what make the Vercel pair readable from
 * Client Components/the browser bundle - Vercel exposes them automatically
 * ("Automatically expose System Environment Variables", on by default for
 * a Next.js project); nothing to configure. Both are plain hostnames with
 * no protocol, hence the `https://` prefix below.
 *
 * Falls back to `http://localhost:3000` for local dev (`next dev`) and for
 * anywhere none of the above is set (Vitest, CI).
 */
export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  return "http://localhost:3000";
};
