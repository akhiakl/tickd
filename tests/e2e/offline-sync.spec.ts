import { and, eq } from "drizzle-orm";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/test";
import { seedFreshGroup, testDb } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { dailyChecks } from "../../src/server/db/schema";
import { DEFAULT_CHECKLIST_ITEMS } from "../../src/lib/constants";

/**
 * Exercises the durable tx queue (docs/local-first-sync-engine-plan.md,
 * Phases 1-2) end to end: a write whose network round trip is failing
 * still shows correctly, survives a real page reload, and lands in
 * Postgres once the network recovers - without ever losing or duplicating
 * it.
 *
 * These don't use `context.setOffline(true)`: a genuinely offline browser
 * context can't load a fresh document at all under this app's
 * architecture (no service worker - see the plan's Phase 2 scope note),
 * so `page.reload()` itself would fail rather than exercise the thing
 * under test. Instead, `page.route()` aborts just the Server Action's own
 * POST (matched the same way `fixtures/wait.ts`'s `waitForServerAction`
 * matches it: the `next-action` header, not the URL - every Server Action
 * in this app posts back to the current page's own URL) while leaving
 * normal navigation/asset requests untouched. That models a degraded
 * connection precisely enough to test the queue, and still lets a real
 * reload happen mid-test - closer to "flaky mobile signal" than "airplane
 * mode," and the more common real failure mode anyway.
 */

/**
 * Suppresses the browser's `unhandledrejection` event. `TimezoneSync`
 * (src/components/timezone-sync.tsx, mounted unconditionally in the root
 * layout) fires a fire-and-forget Server Action on every page and doesn't
 * catch its own rejection - harmless in production (a failed background
 * sync just retries next visit), but this suite's blanket `page.route()`
 * interception aborts *every* pending Server Action call while armed,
 * including that unrelated one, which would otherwise surface as test
 * noise unconnected to what's actually under test here.
 */
async function suppressUnhandledRejections(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (e) => e.preventDefault());
  });
}

/** Polls `dailyChecks` for `userId`/`checklistItemId` until its row count
 * matches `expected` or the timeout elapses. `expect.poll` rather than a
 * fixed wait: the drain loop's own backoff timing (src/lib/sync/drain.ts)
 * isn't something this test should hard-code. */
async function pollCheckCount(userId: string, checklistItemId: string, expected: number) {
  await expect
    .poll(
      async () => {
        const rows = await testDb.query.dailyChecks.findMany({
          where: and(
            eq(dailyChecks.userId, userId),
            eq(dailyChecks.checklistItemId, checklistItemId),
          ),
        });
        return rows.length;
      },
      { timeout: 10_000 },
    )
    .toBe(expected);
}

test.describe("Offline-safe checklist sync (durable tx queue)", () => {
  test("a tick made while writes are failing survives a reload and syncs once the network recovers", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await suppressUnhandledRejections(page);
    await page.goto(`/g/${group.groupId}`);

    const itemId = group.items[0].id;
    const itemLabel = DEFAULT_CHECKLIST_ITEMS[0];

    let blocking = true;
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (blocking && req.method() === "POST" && (await req.headerValue("next-action"))) {
        return route.abort("failed");
      }
      return route.continue();
    });

    await page.getByRole("button", { name: itemLabel, exact: false }).click();

    // Optimistic paint happens regardless of the network - this is the
    // same instant feedback the non-offline tests already cover, asserted
    // here only to establish the starting point before reload.
    await expect(page.getByText(itemLabel)).toHaveClass(/line-through/);

    // The write keeps failing - nothing has reached Postgres yet. Confirms
    // the queue, not a lost/silently-dropped write, is what's holding this.
    await pollCheckCount(group.admin.id, itemId, 0);

    await page.reload();

    // Reconciled from the durable IndexedDB queue
    // (src/lib/sync/reconcile.ts), not from the server-rendered props -
    // the DB write still hasn't landed, so a naive re-render from props
    // alone would show this unchecked again.
    await expect(page.getByText(itemLabel)).toHaveClass(/line-through/);

    // Network recovers - the drain loop's own backoff (src/lib/sync/drain.ts)
    // picks the write back up without any further user action.
    blocking = false;
    await pollCheckCount(group.admin.id, itemId, 1);
  });

  test("an offline rename in Settings survives a reload and syncs once the network recovers", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await suppressUnhandledRejections(page);
    await page.goto(`/g/${group.groupId}/settings`);

    const itemId = group.items[0].id;
    const original = DEFAULT_CHECKLIST_ITEMS[0];
    const renamed = "Wake before 6";

    let blocking = true;
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (blocking && req.method() === "POST" && (await req.headerValue("next-action"))) {
        return route.abort("failed");
      }
      return route.continue();
    });

    const checklist = page.getByTestId("checklist-items");
    await checklist.locator(`input[value="${original}"]`).fill(renamed);
    await expect(checklist.locator(`input[value="${renamed}"]`)).toBeVisible();

    let rows = await testDb.query.checklistItems.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.id, itemId),
    });
    expect(rows[0]?.label).toBe(original);

    await page.reload();

    // Reconciled from the queue, same as the Today checklist above -
    // reopening Settings shows the not-yet-synced rename immediately.
    await expect(
      page.getByTestId("checklist-items").locator(`input[value="${renamed}"]`),
    ).toBeVisible();

    blocking = false;
    await expect
      .poll(
        async () => {
          rows = await testDb.query.checklistItems.findMany({
            where: (t, { eq: eqOp }) => eqOp(t.id, itemId),
          });
          return rows[0]?.label;
        },
        { timeout: 10_000 },
      )
      .toBe(renamed);
  });
});
