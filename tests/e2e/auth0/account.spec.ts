import { test, expect } from "../fixtures/test";
import { seedFreshGroup } from "../fixtures/db";
import { signInAs } from "../fixtures/auth-session";
import { FAKE_AUTH0_URL } from "../fixtures/constants";

test.describe("account settings (Auth0 mode)", () => {
  test("sign out clears the session and ends the Auth0 session too", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL("/");
    await page.goto("/account");
    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
  });
});
