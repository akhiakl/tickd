import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { waitForServerAction } from "./fixtures/wait";

test.describe("account settings", () => {
  test("edit name, pick a color, and toggle preferences persist across reload", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    await page.goto("/account");
    await expect(page.getByLabel("Your name")).toHaveValue(group.admin.name);

    const nameInput = page.getByLabel("Your name");
    await nameInput.fill("Ada Renamed");
    await waitForServerAction(page, () => nameInput.blur());
    await expect(nameInput).toHaveValue("Ada Renamed");

    const secondSwatch = page.getByRole("button", { name: /^Choose #/ }).nth(1);
    await waitForServerAction(page, () => secondSwatch.click());
    await expect(secondSwatch).toHaveClass(/border-text\b/);

    const reminderToggle = page.getByRole("button", { name: /Evening nudge/ });
    // Reminder is on by default; this turns it off.
    await waitForServerAction(page, () => reminderToggle.click());

    await page.reload();
    await expect(page.getByLabel("Your name")).toHaveValue("Ada Renamed");
    await expect(page.getByRole("button", { name: /^Choose #/ }).nth(1)).toHaveClass(
      /border-text\b/,
    );
    // A switch's on/off state renders via the inner track's background color class.
    await expect(
      page.getByRole("button", { name: /Evening nudge/ }).locator('[role="switch"]'),
    ).not.toHaveClass(/bg-accent\b/);
  });

  test("lists groups with the right role label and links to the right screen", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    await page.goto("/account");
    const adminRow = page.getByRole("link", { name: group.groupName });
    await expect(adminRow).toContainText("admin");
    await adminRow.click();
    await expect(page).toHaveURL(`/g/${group.groupId}/settings`);

    await signInAs(context, group.members[0], baseURL!);
    await page.goto("/account");
    const memberRow = page.getByRole("link", { name: group.groupName });
    await expect(memberRow).toContainText("member");
    await memberRow.click();
    await expect(page).toHaveURL(`/g/${group.groupId}`);
  });

  test("sign out clears the session", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL("/");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/signin\/guest\?callbackUrl=%2Faccount/);
  });
});
