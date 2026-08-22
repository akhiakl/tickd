import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { waitForServerAction } from "./fixtures/wait";
import { DEFAULT_CHECKLIST_ITEMS } from "../../src/lib/constants";

test.describe("Group settings", () => {
  test("a non-admin member is redirected away", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.members[0], baseURL!);

    await page.goto(`/g/${group.groupId}/settings`);
    await expect(page).toHaveURL(`/g/${group.groupId}`);
  });

  test("invite code can be copied and regenerated", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-write", "clipboard-read"]);
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}/settings`);
    await expect(page.getByText(group.inviteCode)).toBeVisible();

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByText("Invite link copied")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(`tickd.app/j/${group.inviteCode}`);

    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(page.getByText(group.inviteCode)).toHaveCount(0);
    await expect(page.getByText(/^New code: /)).toBeVisible();
  });

  test("checklist items can be added, renamed, removed, and reordered, and it persists", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/settings`);

    const checklist = page.getByTestId("checklist-items");
    const [first, second] = DEFAULT_CHECKLIST_ITEMS;

    // Rename.
    await waitForServerAction(page, () =>
      checklist.locator(`input[value="${first}"]`).fill("Wake before 6"),
    );

    // Remove.
    await waitForServerAction(page, () =>
      checklist
        .locator(`input[value="${DEFAULT_CHECKLIST_ITEMS[2]}"]`)
        .locator("..")
        .getByLabel("Remove item")
        .click(),
    );

    // Add.
    await waitForServerAction(page, () =>
      page.getByRole("button", { name: "+ Add an item" }).click(),
    );

    // Reorder: move the (renamed) first row down one slot via the keyboard.
    // The rename/remove/add above just settled the DOM - give dnd-kit's
    // rect measurements a beat to catch up, otherwise the keyboard sensor's
    // collision detection can compute a stale sibling and overshoot by a
    // slot.
    await page.waitForTimeout(300);
    const renamedRow = checklist.locator('input[value="Wake before 6"]').locator("..");
    await renamedRow.getByLabel("Drag to reorder").focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(150); // let dnd-kit commit "dragging" state
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    await waitForServerAction(page, () => page.keyboard.press("Space"));

    await page.reload();
    const rows = page.getByTestId("checklist-items").locator("input");
    await expect(rows.nth(0)).toHaveValue(second);
    await expect(rows.nth(1)).toHaveValue("Wake before 6");
    await expect(
      page.getByTestId("checklist-items").locator(`input[value="${DEFAULT_CHECKLIST_ITEMS[2]}"]`),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("checklist-items").locator('input[value="New item"]'),
    ).toBeVisible();
  });

  test("a member can be removed", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/settings`);

    await expect(page.getByText("Marcus")).toBeVisible();
    const marcusRow = page.getByText("Marcus").locator("..");
    await waitForServerAction(page, () =>
      marcusRow.getByRole("button", { name: "Remove" }).click(),
    );
    await expect(page.getByText("Marcus")).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Marcus")).toHaveCount(0);
    await expect(page.getByText("Priya")).toBeVisible();
  });

  test("archiving shows a confirmation toast", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/settings`);

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Group archived")).toBeVisible();
  });

  test("deleting requires an explicit confirmation and then removes the group", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}/settings`);

    await page.getByRole("button", { name: "Delete group" }).click();
    await expect(page.getByText(/Delete for good\?/)).toBeVisible();

    await page.getByRole("button", { name: "Never mind" }).click();
    await expect(page.getByText(/Delete for good\?/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete group" })).toBeVisible();

    await page.getByRole("button", { name: "Delete group" }).click();
    await page.getByRole("button", { name: "Yes, delete it" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(group.groupName)).toHaveCount(0);
  });
});
