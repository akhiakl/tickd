import { test, expect } from "./fixtures/test";

test.describe("guest sign-in", () => {
  test("protected route redirects to the guest name screen, no Auth0 involved", async ({
    page,
  }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/signin\/guest\?callbackUrl=%2Fcreate/);
  });

  test("typing a name signs you in and lands back on the original destination", async ({
    page,
  }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/signin\/guest/);

    await page.getByLabel("Your name").fill("Priya");
    await page.getByRole("button", { name: "Continue" }).click();

    // `signIn()`'s own internal redirect (Auth.js's `createActionURL`, not
    // our `NextResponse.redirect` calls elsewhere) can resolve the dev
    // server's loopback host as `localhost` rather than the `127.0.0.1`
    // Playwright's `baseURL` uses - same server, same path, so match on
    // path only rather than the exact host.
    await expect(page).toHaveURL(/\/create$/);

    // A brand-new guest has no groups yet, but the sign-in itself
    // succeeded: visiting another protected route no longer bounces to
    // the guest screen.
    await page.goto("/account");
    await expect(page).toHaveURL("/account");
    await expect(page.getByLabel("Your name")).toHaveValue("Priya");
    await expect(page.getByText("Guest account")).toBeVisible();
  });

  test("an empty name shows an inline error and does not sign in", async ({ page }) => {
    await page.goto("/signin/guest?callbackUrl=%2Fcreate");
    const submit = page.getByRole("button", { name: "Continue" });

    // The input is `required`, so the browser blocks a truly empty
    // submit - fill then clear to exercise the server-side validation path.
    await page.getByLabel("Your name").fill("a");
    await page.getByLabel("Your name").fill("");
    await page.getByLabel("Your name").fill("   ");
    await submit.click();

    await expect(page.getByText("Enter a name.")).toBeVisible();
    await expect(page).toHaveURL(/\/signin\/guest/);
  });
});
