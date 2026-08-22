/* eslint-disable react-hooks/rules-of-hooks -- this is Playwright's own
   fixture convention (a callback parameter named `use`), not React's
   `use()` hook; the rule can't tell the difference in a non-React file. */
import { test as base, expect, type Page } from "@playwright/test";

const HYDRATION_TIMEOUT_MS = 15_000;

async function waitForHydration(page: Page) {
  await page
    .waitForFunction(() => document.documentElement.dataset.hydrated === "true", undefined, {
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .catch(() => {
      // If this ever times out the next action's own auto-wait/retry will
      // surface the real error - this is purely a best-effort head start.
    });
}

/**
 * The project's `test`, extended so every full page load (`goto`, `reload`)
 * waits for React to hydrate before handing control back. Without this, a
 * click can land on server-rendered markup whose event handlers haven't
 * attached yet and falls through to a native, unhandled form submission -
 * the single biggest source of flakiness in this suite.
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    const originalReload = page.reload.bind(page);

    page.goto = (async (...args: Parameters<Page["goto"]>) => {
      const response = await originalGoto(...args);
      await waitForHydration(page);
      return response;
    }) as Page["goto"];

    page.reload = (async (...args: Parameters<Page["reload"]>) => {
      const response = await originalReload(...args);
      await waitForHydration(page);
      return response;
    }) as Page["reload"];

    await use(page);
  },
});

export { expect };
