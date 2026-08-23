import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { FAKE_AUTH0_URL } from "./fixtures/constants";

test.describe("landing page", () => {
  test.describe("signed out", () => {
    test("shows the hero and both entry points", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("Everyone's")).toBeVisible();
      await expect(page.getByRole("link", { name: "Start a group" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Join with a code" })).toBeVisible();
      await expect(page.getByText("Your groups")).toHaveCount(0);
    });

    test("redirects straight to Auth0's hosted login when starting a group", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Start a group" }).click();
      await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
    });

    test("redirects straight to Auth0's hosted login when joining with a code", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Join with a code" }).click();
      await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
    });

    test("protected group routes also redirect to Auth0's hosted login", async ({ page }) => {
      await page.goto("/g/some-group-id");
      await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
    });
  });

  test.describe("signed in", () => {
    test("lists the groups the user belongs to", async ({ page, context, baseURL }) => {
      const group = await seedFreshGroup();
      await signInAs(context, group.admin, baseURL!);

      await page.goto("/");
      await expect(page.getByText("Your groups")).toBeVisible();
      const card = page.getByRole("link", { name: group.groupName });
      await expect(card).toBeVisible();
      await expect(card).toContainText(`day 1 of ${group.durationDays}`);

      await card.click();
      await expect(page).toHaveURL(`/g/${group.groupId}`);
    });
  });
});
