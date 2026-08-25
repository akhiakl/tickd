import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs, signInAsStaleUser } from "./fixtures/auth-session";

/**
 * A session cookie can be cryptographically valid and still be "stale" -
 * pointing at a user row that no longer exists (a dev database wiped/
 * reseeded out from under a browser that kept its old cookie, or an
 * account that was actually deleted). Middleware alone lets this through
 * (it never touches the database - see src/auth-edge.ts's own comment),
 * so every page used to hit this as `getUserById`/`getGroupSnapshot`
 * quietly returning nothing - a blank screen with no explanation, instead
 * of the same "sign in to continue" experience an anonymous visitor gets.
 * `requireValidUserId` (src/server/auth/require-user.ts) is the fix:
 * detect it and clear the stale cookie via
 * src/app/api/auth/clear-session/route.ts, landing back on the page the
 * visitor was actually trying to reach.
 */
test.describe("A stale (cryptographically valid, DB-orphaned) session", () => {
  test("clears itself and lands on sign-in when visiting a protected group page", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAsStaleUser(context, baseURL!);

    await page.goto(`/g/${group.groupId}`);

    // Redirected through clear-session to /signin, which (guest mode -
    // this suite's default) hands off to the name-entry screen, carrying
    // the original destination along as callbackUrl.
    await expect(page).toHaveURL(
      new RegExp(`/signin/guest\\?callbackUrl=${encodeURIComponent(`/g/${group.groupId}`)}`),
    );

    // The stale cookie is actually gone, not just ignored for this one
    // request - a fresh navigation to the same page redirects the same
    // way again rather than, say, erroring on a half-cleared session.
    await page.goto(`/g/${group.groupId}`);
    await expect(page).toHaveURL(/\/signin\/guest/);
  });

  test("clears itself and lands on sign-in when visiting /account", async ({
    page,
    context,
    baseURL,
  }) => {
    await signInAsStaleUser(context, baseURL!);

    await page.goto("/account");

    await expect(page).toHaveURL(
      new RegExp(`/signin/guest\\?callbackUrl=${encodeURIComponent("/account")}`),
    );
  });

  test("a real, valid session still works normally", async ({ page, context, baseURL }) => {
    // Guards against a false-positive pass above: confirms the check is
    // actually distinguishing "user doesn't exist" from "session exists",
    // not just always redirecting to sign-in regardless.
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}`);
    await expect(page).toHaveURL(`/g/${group.groupId}`);
    await expect(page.getByText(group.groupName)).toBeVisible();
  });
});
