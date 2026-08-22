import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

test.describe("Standings", () => {
  test("ranks members by items completed, highest first, with 'This month' active by default", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}/ranks`);
    await expect(page.getByText("Standings")).toBeVisible();
    await expect(page.getByRole("link", { name: "This month" })).toHaveClass(/bg-panel\b/);

    const rows = await page.locator('a[href*="/members/"]').allTextContents();
    expect(rows[0]).toContain("Ada");
    expect(rows[0]).toContain("(you)");
    expect(rows.findIndex((t) => t.includes("Ada"))).toBeLessThan(
      rows.findIndex((t) => t.includes("Priya")),
    );
    expect(rows.findIndex((t) => t.includes("Priya"))).toBeLessThan(
      rows.findIndex((t) => t.includes("Marcus")),
    );
  });

  test("switching the filter updates the URL and the active pill", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/ranks`);

    await page.getByRole("link", { name: "This week" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}/ranks?w=week`);
    await expect(page.getByRole("link", { name: "This week" })).toHaveClass(/bg-panel\b/);

    await page.getByRole("link", { name: "All time" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}/ranks?w=all`);
    await expect(page.getByRole("link", { name: "All time" })).toHaveClass(/bg-panel\b/);
  });

  test("clicking a row goes to that member's profile", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/ranks`);

    await page.getByRole("link", { name: /Priya/ }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}/members/${group.members[0].id}`);
  });
});
