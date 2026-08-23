import { defineConfig, devices } from "@playwright/test";
import {
  PORT,
  baseURL,
  executablePath,
  testDatabaseUrl,
  reporters,
} from "./tests/e2e/playwright.shared";

// Default config: guest mode, matching production's default (Auth0
// disabled - see src/lib/flags.ts). Auth0-hosted-login coverage lives in
// tests/e2e/auth0/ and runs under playwright.auth0.config.ts instead,
// since a single running dev server can't switch modes at runtime.
const appEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  AUTH_SECRET: "e2e-test-secret-do-not-use-in-production",
  NEXT_PUBLIC_APP_URL: baseURL,
  AUTH0_ENABLED: "false",
  PORT: String(PORT),
};

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: reporters,
  timeout: 30_000,
  // `next dev` compiles each route on its first visit rather than ahead of
  // time - a route nobody's hit yet in this run (e.g. /wall, /ranks, the
  // share-card image route) can take longer than the default 5s assertion
  // timeout to first respond, especially under load. This isn't about
  // flaky app behavior, it's dev-mode's lazy compilation; bump the bar
  // rather than let whichever test happens to visit a route first eat a
  // spurious timeout.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Deterministic: the theme toggle test flips light/dark and needs a
    // known starting point rather than whatever the OS happens to prefer.
    colorScheme: "light",
  },
  projects: [
    {
      // Functional/behavioral coverage: everything except the a11y scans
      // and the Auth0-hosted-login specs (see playwright.auth0.config.ts).
      name: "e2e",
      testIgnore: [/a11y\.spec\.ts/, /auth0\//],
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
    {
      // Accessibility scans, kept separate so CI can report and gate on
      // them independently from functional coverage.
      name: "a11y",
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: appEnv,
  },
});
