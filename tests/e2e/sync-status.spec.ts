import { test, expect } from "./fixtures/test";
import { seedFreshGroup, seedLoneUser } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

/**
 * Covers what's actually verifiable against this suite's environment:
 * auth/membership gating on `/api/g/[groupId]/sync-status`, and the
 * documented "Redis not configured" fail-closed behavior (see the route's
 * own comment). This suite doesn't provision Redis (`playwright.config.ts`'s
 * `appEnv` sets none of `KV_REST_API_*`/`UPSTASH_REDIS_REST_*`), so
 * `updatedAt` here is always 0 - a genuine cross-session test ("does a
 * groupmate's tick actually move the timestamp and get picked up by
 * useGroupLiveSync's poll") needs a real Redis instance in the test
 * environment, which is a CI/infra decision out of scope for this change.
 * Recorded as a known gap in docs/local-first-sync-engine-plan.md rather
 * than silently skipped or faked here.
 */
test.describe("Live-sync status endpoint", () => {
  test("401s an unauthenticated request", async ({ page, baseURL }) => {
    const group = await seedFreshGroup();
    const res = await page.request.get(`${baseURL}/api/g/${group.groupId}/sync-status`);
    expect(res.status()).toBe(401);
  });

  test("404s a signed-in user who isn't a member of the group", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    const outsider = await seedLoneUser("Nora");
    await signInAs(context, outsider, baseURL!);

    const res = await page.request.get(`${baseURL}/api/g/${group.groupId}/sync-status`);
    expect(res.status()).toBe(404);
  });

  test("200s a member, failing closed to updatedAt: 0 when Redis isn't configured", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    const res = await page.request.get(`${baseURL}/api/g/${group.groupId}/sync-status`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ updatedAt: 0 });
  });
});
