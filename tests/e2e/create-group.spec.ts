import { test, expect } from "./fixtures/test";
import { seedLoneUser } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { DEFAULT_CHECKLIST_ITEMS } from "../../src/lib/constants";

test.describe("create a group", () => {
  test("fills the form, edits the checklist, and lands on the new group", async ({
    page,
    context,
    baseURL,
  }) => {
    const user = await seedLoneUser("Founder");
    await signInAs(context, user, baseURL!);

    await page.goto("/create");
    await page.getByPlaceholder("The August Eight").fill("Sunrise Run Crew");

    const twentyOne = page.getByRole("button", { name: "21 days" });
    await twentyOne.click();
    await expect(twentyOne).toHaveClass(/bg-panel\b/);

    const checklist = page.getByTestId("checklist-items");

    // Default checklist is present, last slot is the side quest.
    for (const label of DEFAULT_CHECKLIST_ITEMS) {
      await expect(checklist.locator(`input[value="${label}"]`)).toBeVisible();
    }

    // Remove the second item.
    const secondRow = checklist
      .locator(`input[value="${DEFAULT_CHECKLIST_ITEMS[1]}"]`)
      .locator("..");
    await secondRow.getByLabel("Remove item").click();
    await expect(checklist.locator(`input[value="${DEFAULT_CHECKLIST_ITEMS[1]}"]`)).toHaveCount(0);
    await expect(page.getByText(/7 items/)).toBeVisible();

    // Rename the first item.
    const firstInput = checklist.locator(`input[value="${DEFAULT_CHECKLIST_ITEMS[0]}"]`);
    await firstInput.fill("Wake before 6");

    // Add a new item.
    await page.getByRole("button", { name: "+ Add an item" }).click();
    await expect(checklist.locator('input[value="New item"]')).toBeVisible();
    await expect(page.getByText(/8 items/)).toBeVisible();

    await page.getByRole("button", { name: "Create & get invite link" }).click();

    await expect(page).toHaveURL(/\/g\/[^/]+$/);
    await expect(page.getByText("Sunrise Run Crew")).toBeVisible();
    await expect(page.getByTestId("today-header-day")).toContainText("Day 1 of 21");
    await expect(page.getByText("Wake before 6")).toBeVisible();
  });

  test("drag-to-reorder moves an item via the keyboard", async ({ page, context, baseURL }) => {
    const user = await seedLoneUser("Reorderer");
    await signInAs(context, user, baseURL!);

    await page.goto("/create");
    const [first, second] = DEFAULT_CHECKLIST_ITEMS;
    const checklist = page.getByTestId("checklist-items");

    // Let dnd-kit compute fresh item rects before starting keyboard drag.
    await page.waitForTimeout(300);
    const firstRow = checklist.locator(`input[value="${first}"]`).locator("..");
    await firstRow.getByLabel("Drag to reorder").focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(150); // let dnd-kit commit "dragging" state
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    await page.keyboard.press("Space");

    const rows = checklist.locator("input");
    await expect(rows.nth(0)).toHaveValue(second);
    await expect(rows.nth(1)).toHaveValue(first);
  });

  test("shows a validation error for a whitespace-only name", async ({
    page,
    context,
    baseURL,
  }) => {
    const user = await seedLoneUser("Empty");
    await signInAs(context, user, baseURL!);

    await page.goto("/create");
    // The input is HTML-required (non-empty), so a whitespace-only value is
    // what actually reaches the server action's `.trim().min(1)` check.
    await page.getByPlaceholder("The August Eight").fill("   ");
    await page.getByRole("button", { name: "Create & get invite link" }).click();
    await expect(page.getByText("Give the group a name.")).toBeVisible();
    await expect(page).toHaveURL("/create");
  });
});
