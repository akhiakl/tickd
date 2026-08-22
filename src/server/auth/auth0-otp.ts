import "server-only";

/**
 * Auth0's Passwordless API, called directly so the app can render its own
 * six-digit code screen instead of redirecting to Auth0's hosted widget.
 * Google and Apple sign-in still redirect through Auth0 (see `src/auth.ts`)
 * because a real OAuth handshake cannot happen any other way; email is the
 * one flow Auth0 lets a first-party client fully own end to end.
 *
 * Docs: https://auth0.com/docs/api/authentication#passwordless
 */

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * The Auth0 Authentication API base URL. In production this is always
 * `https://${AUTH0_DOMAIN}`. `AUTH0_BASE_URL` is an escape hatch used only
 * by the Playwright E2E suite to point these calls at a local fake Auth0
 * server instead (see `tests/e2e/fixtures/fake-auth0-server.ts`) - it's
 * never set outside that harness.
 */
function authBaseUrl() {
  return process.env.AUTH0_BASE_URL ?? `https://${env("AUTH0_DOMAIN")}`;
}

function tokenEndpointBody(extra: Record<string, string>) {
  const body: Record<string, string> = {
    client_id: env("AUTH0_CLIENT_ID"),
    ...extra,
  };
  // Confidential (Regular Web App) Auth0 clients require a secret; public
  // clients configured for passwordless don't have one. Include it only
  // when configured so either client type works.
  if (process.env.AUTH0_CLIENT_SECRET) {
    body.client_secret = process.env.AUTH0_CLIENT_SECRET;
  }
  return body;
}

/** Starts a passwordless flow: Auth0 emails the user a six-digit code. */
export async function startEmailOtp(email: string) {
  const res = await fetch(`${authBaseUrl()}/passwordless/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tokenEndpointBody({ connection: "email", email, send: "code" })),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Auth0 passwordless/start failed (${res.status}): ${detail}`);
  }
}

export type VerifiedIdentity = {
  authSub: string;
  email: string;
  name: string;
};

/**
 * Verifies the six-digit code against Auth0 and returns the caller's
 * identity. Throws if the code is wrong or expired.
 */
export async function verifyEmailOtp(email: string, code: string): Promise<VerifiedIdentity> {
  const base = authBaseUrl();
  const tokenRes = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      tokenEndpointBody({
        grant_type: "http://auth0.com/oauth/grant-type/passwordless/otp",
        username: email,
        otp: code,
        realm: "email",
        scope: "openid profile email",
      }),
    ),
  });
  if (!tokenRes.ok) {
    throw new Error("That code didn't match. Check it and try again.");
  }
  const { access_token: accessToken } = (await tokenRes.json()) as {
    access_token: string;
  };

  const userInfoRes = await fetch(`${base}/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) {
    throw new Error("Could not confirm your account with Auth0.");
  }
  const profile = (await userInfoRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
  };

  return {
    authSub: profile.sub,
    email: profile.email ?? email,
    name: profile.name ?? email.split("@")[0],
  };
}
