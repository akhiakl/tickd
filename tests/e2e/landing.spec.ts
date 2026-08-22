import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

test.describe("landing page", () => {
  test.describe("signed out", () => {
    test("shows the hero and both entry points", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("Everyone's")).toBeVisible();
      await expect(page.getByRole("link", { name: "Start a group" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Join with a code" })).toBeVisible();
      await expect(page.getByText("Your groups")).toHaveCount(0);
    });

    test("redirects to /login with a callbackUrl when starting a group", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Start a group" }).click();
      await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcreate/);
    });

    test("redirects to /login when joining with a code", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "Join with a code" }).click();
      await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fjoin/);
    });

    test("protected group routes also redirect to /login", async ({ page }) => {
      await page.goto("/g/some-group-id");
      await expect(page).toHaveURL(/\/login\?callbackUrl=/);
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
