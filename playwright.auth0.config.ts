import { defineConfig, devices } from "@playwright/test";
import {
  PORT,
  FAKE_AUTH0_PORT,
  baseURL,
  fakeAuth0Url,
  executablePath,
  testDatabaseUrl,
  reporters,
} from "./tests/e2e/playwright.shared";

// Opt-in config: Auth0 hosted-login mode. Run this explicitly
// (`pnpm run test:e2e:auth0`) to cover the flow from tests/e2e/auth0/ -
// the default playwright.config.ts runs everything else in guest mode,
// matching production's default (see src/lib/flags.ts).
const appEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  AUTH_SECRET: "e2e-test-secret-do-not-use-in-production",
  NEXT_PUBLIC_APP_URL: baseURL,
  AUTH0_ENABLED: "true",
  AUTH0_DOMAIN: "fake-auth0.test",
  AUTH0_CLIENT_ID: "e2e-test-client",
  AUTH0_CLIENT_SECRET: "e2e-test-client-secret",
  AUTH0_ISSUER: fakeAuth0Url,
  PORT: String(PORT),
};

export default defineConfig({
  testDir: "./tests/e2e/auth0",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: reporters,
  // Auth0 mode's provider now loads via a dynamic `import()` (see
  // src/auth.ts) so its bundle doesn't reach middleware when disabled -
  // the tradeoff is a one-time cold-load of that module on whichever
  // request first needs it in a fresh dev server, on top of next dev's
  // usual lazy per-route compilation. Only ever pays once per server
  // boot, but this suite's small size means that's very likely the very
  // first test - give the whole suite more room, not app flakiness.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    colorScheme: "light",
  },
  projects: [
    {
      name: "e2e-auth0",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
  ],
  webServer: [
    {
      command: "pnpm exec tsx tests/e2e/fixtures/fake-auth0-server.ts",
      url: `${fakeAuth0Url}/health`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_AUTH0_PORT: String(FAKE_AUTH0_PORT) },
    },
    {
      command: `pnpm exec next dev -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: appEnv,
    },
  ],
});
