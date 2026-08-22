import type { Page } from "@playwright/test";

/**
 * Runs `trigger` and waits for the POST it causes (a Next.js Server Action
 * round trip) to resolve, before returning. Several UI actions in this app
 * update optimistically and persist in the background - reloading right
 * after a click would otherwise race the actual database write.
 */
export async function waitForServerAction(page: Page, trigger: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "POST"),
    trigger(),
  ]);
  return response;
}
