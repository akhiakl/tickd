import { encode } from "@auth/core/jwt";
import type { BrowserContext } from "@playwright/test";
import type { SeededUser } from "./db";

const AUTH_SECRET = "e2e-test-secret-do-not-use-in-production";
// Auth.js derives its encryption key from the session cookie's own name
// (see `@auth/core`'s `lib/utils/session.js`); on a plain http:// origin
// (no HTTPS, as in this suite) that name is unprefixed.
const SESSION_COOKIE_NAME = "authjs.session-token";

/**
 * Mints a valid Auth.js session cookie for a seeded user directly, the way
 * the Auth.js docs recommend testing authenticated routes: no UI sign-in,
 * no network call to Auth0 at all. `token.appUserId` is exactly what
 * `src/auth.ts`'s `session` callback reads to populate `session.user.id`.
 */
async function encodeSessionToken(user: SeededUser) {
  return encode({
    secret: AUTH_SECRET,
    salt: SESSION_COOKIE_NAME,
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      appUserId: user.id,
    },
  });
}

/** Signs a browser context in as `user`, before any page in it navigates. */
export async function signInAs(context: BrowserContext, user: SeededUser, baseURL: string) {
  const value = await encodeSessionToken(user);
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Signs a browser context in with a cryptographically valid session that
 * references a user id never inserted into the database - the scenario
 * `requireValidUserId` (src/server/auth/require-user.ts) exists to catch:
 * a JWT that's fine on its own but points at a row that's gone (a stale
 * cookie from a wiped/reseeded dev database, or a deleted account).
 * Middleware alone can't tell this apart from a real signed-in user (it
 * never touches the database - see src/auth-edge.ts's own comment), so
 * this is the one way to actually exercise that path in a test.
 */
export async function signInAsStaleUser(context: BrowserContext, baseURL: string) {
  const ghostId = crypto.randomUUID();
  await signInAs(
    context,
    {
      id: ghostId,
      email: `ghost-${ghostId}@example.com`,
      name: "Ghost",
      color: "",
      avatarSeed: "",
    },
    baseURL,
  );
}
