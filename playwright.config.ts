import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import { existsSync } from "node:fs";

const PORT = 3100;
const FAKE_AUTH0_PORT = 4399;
const baseURL = `http://127.0.0.1:${PORT}`;
const fakeAuth0Url = `http://127.0.0.1:${FAKE_AUTH0_PORT}`;

// This sandbox pre-installs Chromium outside Playwright's own cache (see
// AGENTS.md / the repo's dev environment notes) at a revision Playwright's
// own registry doesn't recognize. Point at it explicitly when present;
// otherwise fall back to Playwright's normal managed browser so `npx
// playwright install chromium` still works on a real machine or in CI.
const sandboxChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = existsSync(sandboxChromium) ? sandboxChromium : undefined;

// Every env var the app needs to run against the E2E fake Auth0 server and
// a scratch Postgres database instead of anything real.
const testDatabaseUrl =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/tickd_test";

const appEnv = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  AUTH_SECRET: "e2e-test-secret-do-not-use-in-production",
  NEXT_PUBLIC_APP_URL: baseURL,
  AUTH0_DOMAIN: "fake-auth0.test",
  AUTH0_CLIENT_ID: "e2e-test-client",
  AUTH0_CLIENT_SECRET: "e2e-test-client-secret",
  AUTH0_ISSUER: fakeAuth0Url,
  AUTH0_BASE_URL: fakeAuth0Url,
  PORT: String(PORT),
};

const reporters: ReporterDescription[] = process.env.CI
  ? [["github"], ["html", { open: "never" }]]
  : [["list"]];

if (process.env.PLAYWRIGHT_JSON_OUTPUT_NAME) {
  reporters.push(["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME }]);
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: reporters,
  timeout: 30_000,
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
      // Functional/behavioral coverage: everything except the a11y scans.
      name: "e2e",
      testIgnore: /a11y\.spec\.ts/,
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
  webServer: [
    {
      command: "tsx tests/e2e/fixtures/fake-auth0-server.ts",
      url: `${fakeAuth0Url}/health`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_AUTH0_PORT: String(FAKE_AUTH0_PORT) },
    },
    {
      command: `npx next dev -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: appEnv,
    },
  ],
});
