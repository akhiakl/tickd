import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

test.describe("The wall", () => {
  test("renders the legend, day headers, and every member's row", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}/wall`);
    await expect(page.getByText("The wall")).toBeVisible();
    await expect(page.getByText(`${group.durationDays} days`)).toBeVisible();
    await expect(page.getByText("all 8")).toBeVisible();
    await expect(page.getByText("partial")).toBeVisible();
    await expect(page.getByText("zero")).toBeVisible();

    await expect(page.getByRole("button", { name: /^you, day 1,/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Priya, day 1,/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Marcus, day 1,/i })).toBeVisible();
  });

  test("tapping a cell opens the day's breakdown, and closing it hides it again", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/wall`);

    await page.getByRole("button", { name: "Priya, day 1, 4 of 8 done" }).click();
    await expect(page.getByText("Priya - day 1")).toBeVisible();
    await expect(page.getByText("4 of 8 done")).toBeVisible();

    // Priya ticked the first half of the checklist every seeded day.
    await expect(page.getByText("Exercise for 30 minutes")).toBeVisible();
    await expect(page.getByText("No alcohol or smoking")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Priya - day 1")).toHaveCount(0);
  });

  test("future days are disabled", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/wall`);

    await expect(page.getByRole("button", { name: "You, day 10" })).toBeDisabled();
  });
});
