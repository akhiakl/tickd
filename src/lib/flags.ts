import { flag } from "flags/next";

/**
 * Auth0 is opt-in; unset/false means the app runs in name-only guest mode
 * (see src/auth.ts). A Vercel feature flag rather than a bare env-var
 * check so it shows up in the Vercel Toolbar/dashboard - `decide()` still
 * just reads the env var, so `AUTH0_ENABLED=true pnpm dev` (or setting it
 * in `.env.local`) works exactly the same for local testing as before.
 */
export const auth0Enabled = flag<boolean>({
  key: "auth0-enabled",
  description: "Auth0 hosted login vs. the name-only guest join flow.",
  options: [
    { value: false, label: "Guest mode (default)" },
    { value: true, label: "Auth0" },
  ],
  decide: () => process.env.AUTH0_ENABLED === "true",
});
