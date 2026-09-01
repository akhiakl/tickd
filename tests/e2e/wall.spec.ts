import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { toISODate } from "../../src/lib/challenge-stats";

function daysAgoISO(days: number, now: number): string {
  return toISODate(new Date(now - days * 86_400_000));
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
    const now = Date.now();
    const oneDayAgo = daysAgoISO(1, now);
    await page.getByRole("button", { name: "Priya" }).click();
    // The calendar defaults to the month containing "today" - when today
    // is the 1st of the month, "1 day ago" falls in the previous month
    // and isn't on the visible page yet, so page back to it first. Most
    // days this is a no-op (the button is simply absent because it's
    // already on the right page).
    if (oneDayAgo.slice(0, 7) !== toISODate(new Date(now)).slice(0, 7)) {
      await page.getByRole("button", { name: "Previous month" }).click();
    }
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

    const now = Date.now();
    const today = toISODate(new Date(now));
    const tomorrow = toISODate(new Date(now + 86_400_000));
    // Only assert this when it's still the same displayed month - a run
    // that happens to land on the last day of the month would need to
    // page forward first, which isn't what this test is checking.
    if (tomorrow.slice(0, 7) === group.startDate.slice(0, 7)) {
      await expect(page.getByLabel(tomorrow)).toBeDisabled();
    }

    // The calendar defaults to today's month, not necessarily the
    // group's start month - those only coincide when historyDays doesn't
    // cross a month boundary (e.g. a run on the 1st-3rd with 4 days of
    // history reaches back into the prior month). "Previous month" is
    // only disabled once there's nothing earlier to page back to, i.e.
    // when the displayed month already *is* the start month.
    const previousMonth = page.getByRole("button", { name: "Previous month" });
    if (today.slice(0, 7) === group.startDate.slice(0, 7)) {
      await expect(previousMonth).toBeDisabled();
    } else {
      await expect(previousMonth).toBeEnabled();
    }
  });
});
