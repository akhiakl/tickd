import { existsSync } from "node:fs";
import type { ReporterDescription } from "@playwright/test";

/**
 * Shared between `playwright.config.ts` (default: guest mode, matching
 * production's default) and `playwright.auth0.config.ts` (opt-in: Auth0
 * hosted-login mode). `auth0Enabled` is resolved once per `src/auth.ts`
 * config build, so one running `next dev` process commits to one mode for
 * its whole life - covering both modes needs two separate dev-server
 * boots, run sequentially via two Playwright configs rather than one.
 */

export const PORT = 3100;
export const FAKE_AUTH0_PORT = 4399;
export const baseURL = `http://127.0.0.1:${PORT}`;
export const fakeAuth0Url = `http://127.0.0.1:${FAKE_AUTH0_PORT}`;

// This sandbox pre-installs Chromium outside Playwright's own cache (see
// AGENTS.md / the repo's dev environment notes) at a revision Playwright's
// own registry doesn't recognize. Point at it explicitly when present;
// otherwise fall back to Playwright's normal managed browser so `pnpm
// exec playwright install chromium` still works on a real machine or in CI.
const sandboxChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
export const executablePath = existsSync(sandboxChromium) ? sandboxChromium : undefined;

export const testDatabaseUrl =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/tickd_test";

export const reporters: ReporterDescription[] = process.env.CI
  ? [["github"], ["html", { open: "never" }]]
  : [["list"]];

if (process.env.PLAYWRIGHT_JSON_OUTPUT_NAME) {
  reporters.push(["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME }]);
}
