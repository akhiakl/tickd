import { createServer } from "node:http";
import { TEST_OTP_CODE, FAKE_AUTH0_PORT, FAKE_AUTH0_URL } from "./constants";

/**
 * A minimal stand-in for Auth0's Authentication API, used only by the
 * Playwright suite. It implements just enough of the OIDC discovery
 * surface for Auth.js's Auth0 provider to redirect a user to `/authorize`
 * (proving the Google sign-in button is wired correctly) and the
 * Passwordless REST endpoints our own code calls directly for email OTP
 * sign-in (`src/server/auth/auth0-otp.ts`). It never validates a real
 * OAuth authorization-code exchange - the suite doesn't attempt to
 * complete a third-party login, only that it *starts* one.
 */

function readJsonBody(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error as Error);
      }
    });
    req.on("error", reject);
  });
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", FAKE_AUTH0_URL);

  if (url.pathname === "/health") {
    res.writeHead(200).end("ok");
    return;
  }

  if (url.pathname === "/.well-known/openid-configuration") {
    json(res, 200, {
      issuer: FAKE_AUTH0_URL,
      authorization_endpoint: `${FAKE_AUTH0_URL}/authorize`,
      token_endpoint: `${FAKE_AUTH0_URL}/oauth/token`,
      userinfo_endpoint: `${FAKE_AUTH0_URL}/userinfo`,
      jwks_uri: `${FAKE_AUTH0_URL}/jwks`,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile", "email"],
    });
    return;
  }

  if (url.pathname === "/jwks") {
    json(res, 200, { keys: [] });
    return;
  }

  if (url.pathname === "/authorize") {
    // The suite only asserts on the URL it lands on (host, path, query),
    // proving the redirect fired with the right params - it doesn't need
    // to render a real consent screen.
    res
      .writeHead(200, { "content-type": "text/html" })
      .end(
        `<html><body data-testid="fake-authorize-page">Fake Auth0 authorize: ${url.search}</body></html>`,
      );
    return;
  }

  if (req.method === "POST" && url.pathname === "/passwordless/start") {
    readJsonBody(req).then(() => json(res, 200, {}));
    return;
  }

  if (req.method === "POST" && url.pathname === "/oauth/token") {
    readJsonBody(req)
      .then((body) => {
        const otp = String(body.otp ?? "");
        const username = String(body.username ?? "");
        if (otp !== TEST_OTP_CODE) {
          json(res, 403, {
            error: "invalid_grant",
            error_description: "Wrong email or verification code.",
          });
          return;
        }
        json(res, 200, {
          access_token: Buffer.from(username).toString("base64url"),
          token_type: "Bearer",
          expires_in: 86400,
        });
      })
      .catch(() => json(res, 400, { error: "invalid_request" }));
    return;
  }

  if (url.pathname === "/userinfo") {
    const auth = req.headers.authorization ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const email = Buffer.from(token, "base64url").toString("utf8");
    if (!email.includes("@")) {
      json(res, 401, { error: "invalid_token" });
      return;
    }
    json(res, 200, {
      sub: `email|${email}`,
      email,
      email_verified: true,
      name: email.split("@")[0],
    });
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(FAKE_AUTH0_PORT, () => {
  console.log(`Fake Auth0 server listening on ${FAKE_AUTH0_URL}`);
});
