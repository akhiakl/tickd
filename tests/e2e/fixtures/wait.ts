import type { Page } from "@playwright/test";

/**
 * Runs `trigger` and waits for whatever Server Action round trip(s) it
 * causes to fully settle, before returning. Several UI actions in this
 * app update optimistically and persist in the background - reloading
 * right after a click would otherwise race the actual database write.
 *
 * Two earlier attempts each had a real gap, found via a throwaway debug
 * spec logging every request/response against the database directly
 * (confirmed the app's own writes were always correct and durable - both
 * gaps were purely in how the test noticed "done"):
 *
 * 1. `page.waitForResponse((res) => res.request().method() === "POST")` -
 *    too loose. This app mounts a few fire-and-forget background actions
 *    (e.g. TimezoneSync's best-effort sync on every page) that can fire
 *    their own POST to the same URL around the same moment as whatever
 *    the test triggered - "the next POST" can resolve on one of those
 *    instead, before the real write lands.
 * 2. `await trigger(); await page.waitForLoadState("networkidle")` - the
 *    `next-action` header fixed the "which POST" problem above, but
 *    dropping the `waitForResponse` entirely for a plain post-hoc
 *    `networkidle` reintroduced a *different* race: `waitForLoadState`
 *    checks whether the network is idle *right now*, not "wait for
 *    whatever's about to start" - between `trigger()` resolving (the
 *    physical click) and this call, the page can be instantaneously idle
 *    if the click handler's own fetch (deferred into a React transition)
 *    hasn't been dispatched yet, so it can return before that fetch even
 *    starts.
 *
 * Closing both gaps without reopening either: drain the network to idle
 * *before* arming the listener, so nothing left over from an earlier step
 * (or a background sync) is still in flight to confuse the match; then
 * register the `next-action`-matching `waitForResponse` before running
 * `trigger()` (so it can't miss a request that fires immediately) and
 * return as soon as that one response lands. Deliberately no *trailing*
 * drain after the match - an earlier version added one and broke a
 * different set of tests that assert on short-lived UI (a toast that
 * auto-dismisses in ~1.7s): waiting for full network idle after the
 * match can itself take a while under load, long enough to run past the
 * toast's own dismiss timer before the test gets to check it.
 */
export async function waitForServerAction(page: Page, trigger: () => Promise<void>) {
  await page.waitForLoadState("networkidle");
  await Promise.all([
    page.waitForResponse(async (res) => {
      if (res.request().method() !== "POST") return false;
      return (await res.request().headerValue("next-action")) !== null;
    }),
    trigger(),
  ]);
}
