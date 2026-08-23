import { createServer } from "node:http";
import { FAKE_AUTH0_PORT, FAKE_AUTH0_URL } from "./constants";

/**
 * A minimal stand-in for Auth0's Authentication API, used only by the
 * Playwright suite. It implements just enough of the OIDC discovery
 * surface for Auth.js's Auth0 provider to redirect a user to `/authorize`
 * (proving unauthenticated visits land on Auth0's hosted login). It never
 * validates a real OAuth authorization-code exchange - the suite doesn't
 * attempt to complete a third-party login, only that it *starts* one.
 */

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

  if (url.pathname === "/v2/logout") {
    // Real Auth0 ends its hosted session, then 302s to `returnTo`. This
    // fake has no session to end, but redirecting is what the suite
    // actually needs to verify (see the sign-out-button's Auth0 logout).
    const returnTo = url.searchParams.get("returnTo") ?? "/";
    res.writeHead(302, { location: returnTo }).end();
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(FAKE_AUTH0_PORT, () => {
  console.log(`Fake Auth0 server listening on ${FAKE_AUTH0_URL}`);
});
