import { test, expect } from "../fixtures/test";
import { FAKE_AUTH0_URL } from "../fixtures/constants";

test.describe("landing page (Auth0 mode)", () => {
  test("redirects straight to Auth0's hosted login when starting a group", async ({ page }) => {
    await page.goto("/");
    // The hero's CTA and the closing CTA band both have a "Start a group"
    // link now that the page is one responsive document rather than a
    // mobile-only hero with a desktop-only closing band - `.first()`
    // picks the hero's.
    await page.getByRole("link", { name: "Start a group" }).first().click();
    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
  });

  test("redirects straight to Auth0's hosted login when joining with a code", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Join with a code" }).click();
    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
  });

  test("protected group routes also redirect to Auth0's hosted login", async ({ page }) => {
    await page.goto("/g/some-group-id");
    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
  });
});
