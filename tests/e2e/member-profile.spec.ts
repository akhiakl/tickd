import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

test.describe("Member profile", () => {
  test("shows my own stats, per-item breakdown, and history", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}/members/${group.admin.id}`);
    await expect(page.getByText("Ada (you)")).toBeVisible();
    await expect(page.getByText("80% of the challenge")).toBeVisible();

    const stats = page.locator("div").filter({ hasText: /^\d+Current streak$/ });
    await expect(stats).toContainText("4");
    await expect(page.getByText("Longest run")).toBeVisible();
    await expect(page.getByText("Items done")).toBeVisible();
    await expect(page.getByText("32", { exact: true })).toBeVisible();

    // Ada ticked every item every seeded day - all eight sit at 80% (4 of 5 days).
    await expect(page.getByText("Wake before 7")).toBeVisible();
    await expect(page.getByText("80%", { exact: true })).toHaveCount(8);
  });

  test("shows another member's profile without '(you)' and with their own numbers", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}/members/${group.members[0].id}`);
    await expect(page.getByText("Priya", { exact: true })).toBeVisible();
    await expect(page.getByText("Priya (you)")).toHaveCount(0);
    await expect(page.getByText("40% of the challenge")).toBeVisible();
  });

  test("back button returns to the group", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}`);
    await page.getByRole("link", { name: "Marcus" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}/members/${group.members[1].id}`);

    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}`);
  });
});
