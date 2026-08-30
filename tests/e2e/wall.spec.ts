import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { toISODate } from "../../src/lib/challenge-stats";

function daysAgoISO(days: number): string {
  return toISODate(new Date(Date.now() - days * 86_400_000));
}

test.describe("The wall", () => {
  test("renders the legend, month header, and every member's avatar", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}/wall`);
    await expect(page.getByText("The wall")).toBeVisible();
    await expect(page.getByText("All done")).toBeVisible();
    await expect(page.getByText("Mostly done")).toBeVisible();
    await expect(page.getByText("Partial")).toBeVisible();
    await expect(page.getByText("Zero")).toBeVisible();
    await expect(page.getByText("Not yet / before start")).toBeVisible();

    await expect(page.getByRole("button", { name: "You" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Priya" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcus" })).toBeVisible();

    const thisMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      new Date(),
    );
    await expect(page.getByText(thisMonth)).toBeVisible();
  });

  test("tapping a day opens its breakdown, and closing it hides it again", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/wall`);

    // Priya ticked the first half of the checklist every seeded day.
    const oneDayAgo = daysAgoISO(1);
    await page.getByRole("button", { name: "Priya" }).click();
    await page.getByRole("button", { name: `${oneDayAgo}, 4 of 8 done` }).click();
    await expect(page.getByText(`Priya - ${oneDayAgo}`)).toBeVisible();
    await expect(page.getByText("4 of 8 done")).toBeVisible();
    await expect(page.getByText("Exercise for 30 minutes")).toBeVisible();
    await expect(page.getByText("No alcohol or smoking")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText(`Priya - ${oneDayAgo}`)).toHaveCount(0);
  });

  test("days after today are disabled, days before the challenge started are muted", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/wall`);

    const tomorrow = toISODate(new Date(Date.now() + 86_400_000));
    // Only assert this when it's still the same displayed month - a run
    // that happens to land on the last day of the month would need to
    // page forward first, which isn't what this test is checking.
    if (tomorrow.slice(0, 7) === group.startDate.slice(0, 7)) {
      await expect(page.getByLabel(tomorrow)).toBeDisabled();
    }

    await expect(page.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });
});
