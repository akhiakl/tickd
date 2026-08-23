import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";
import { waitForServerAction } from "./fixtures/wait";
import { DEFAULT_CHECKLIST_ITEMS } from "../../src/lib/constants";

test.describe("Today dashboard", () => {
  test("header and ring reflect the group's day and my empty-today state", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);

    await page.goto(`/g/${group.groupId}`);
    await expect(page.getByText(group.groupName)).toBeVisible();
    await expect(page.getByTestId("today-header-day")).toContainText(
      `Day 5 of ${group.durationDays}`,
    );

    const ring = page.getByTestId("progress-ring");
    await expect(ring.getByText("0", { exact: true })).toBeVisible();
    await expect(ring.getByText("OF 8")).toBeVisible();
    await expect(page.getByText("Nothing yet today")).toBeVisible();
    // 4 full days back-to-back keep the admin's streak alive coming into today.
    await expect(page.getByText("4-day streak")).toBeVisible();
  });

  test("ticking and unticking items updates the UI and persists", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    const firstItem = page.getByRole("button", { name: DEFAULT_CHECKLIST_ITEMS[0], exact: false });
    await waitForServerAction(page, () => firstItem.click());

    await expect(page.getByText("Ticked - 1/8")).toBeVisible();
    await expect(page.getByTestId("progress-ring").getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText("7 left today")).toBeVisible();

    // Tick the rest for a clean sweep.
    for (const label of DEFAULT_CHECKLIST_ITEMS.slice(1)) {
      await waitForServerAction(page, () => page.getByRole("button", { name: label }).click());
    }
    await expect(page.getByText("Clean sweep. All 8 done.")).toBeVisible();
    await expect(page.getByText("All done today")).toBeVisible();

    // Untick one - state should drop back down.
    await waitForServerAction(page, () =>
      page.getByRole("button", { name: DEFAULT_CHECKLIST_ITEMS[0] }).click(),
    );
    await expect(page.getByTestId("progress-ring").getByText("7", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("progress-ring").getByText("7", { exact: true })).toBeVisible();
    await expect(page.getByText("1 left today")).toBeVisible();
  });

  test("group and personal totals reflect seeded history plus today's ticks", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    // Admin: 4 full days (32) + Priya: 4 half days (16) + Marcus: 0 = 48 before today.
    await expect(page.getByText("GROUP TODAY")).toBeVisible();
    await expect(page.getByText("GROUP TODAY").locator("..")).toContainText("0");
    await expect(page.getByText("YOUR TOTAL").locator("..")).toContainText("32");

    await waitForServerAction(page, () =>
      page.getByRole("button", { name: DEFAULT_CHECKLIST_ITEMS[0] }).click(),
    );
    await expect(page.getByText("GROUP TODAY").locator("..")).toContainText("1");
    await expect(page.getByText("YOUR TOTAL").locator("..")).toContainText("33");
  });

  test("member list is ranked and links to profiles", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    await expect(page.getByText(`${group.members.length + 1} people`)).toBeVisible();
    const adaRow = page.getByRole("link", { name: /Ada \(you\)/ });
    const priyaRow = page.getByRole("link", { name: "Priya" });
    await expect(adaRow).toBeVisible();
    await expect(page.getByRole("link", { name: "Marcus" })).toBeVisible();

    const rowOrder = await page.locator('a[href^="/g/"][href*="/members/"]').allTextContents();
    expect(rowOrder.findIndex((t) => t.includes("Ada"))).toBeLessThan(
      rowOrder.findIndex((t) => t.includes("Priya")),
    );
    expect(rowOrder.findIndex((t) => t.includes("Priya"))).toBeLessThan(
      rowOrder.findIndex((t) => t.includes("Marcus")),
    );

    await priyaRow.click();
    await expect(page).toHaveURL(`/g/${group.groupId}/members/${group.members[0].id}`);
  });

  test("group switcher lists this group as active", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    await page.getByRole("button", { name: new RegExp(`^${group.groupName}`) }).click();
    await expect(page.getByText("Your groups")).toBeVisible();
    const activeRow = page.getByRole("link", { name: new RegExp(group.groupName) });
    await expect(activeRow).toBeVisible();
    await expect(page.getByRole("link", { name: "Join another" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start a group" })).toBeVisible();
  });

  test("share sheet opens with a loadable card image", async ({ page, context, baseURL }) => {
    // The share-card route (Satori-rendered PNG) compiles on its first hit
    // under `next dev`'s on-demand compilation - confirmed by direct
    // reproduction to take several seconds beyond the default budget, not
    // a broken request. `test.slow()` triples this test's timeout rather
    // than loosening every other test's failure-detection sensitivity.
    test.slow();
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    await page.getByRole("button", { name: "Share today" }).click();
    await expect(page.getByText("Share this")).toBeVisible();

    const image = page.getByAltText("Your daily streak card");
    // The share-card route (next/og + Satori) is the heaviest route in the
    // app to cold-compile under `next dev` - reproduced directly taking
    // longer than the suite's general 15s bump on its first hit. Give this
    // one assertion explicit extra room rather than raising the bar
    // suite-wide again.
    await expect(image).toBeVisible({ timeout: 30_000 });
    const src = await image.getAttribute("src");
    const response = await page.request.get(new URL(src!, page.url()).toString());
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });

  test("bottom nav switches between Today, Wall, and Ranks", async ({ page, context, baseURL }) => {
    // /wall and /ranks compile on their first hit under `next dev` -
    // reproduced directly: the click-triggered navigation does complete,
    // it just takes several seconds the first time (Turbopack compiling
    // the route), not a broken link. test.slow() triples this test's
    // timeout rather than loosening every other test's failure-detection
    // sensitivity.
    test.slow();
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    await page.getByRole("link", { name: "Wall" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}/wall`);

    await page.getByRole("link", { name: "Ranks" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}/ranks`);

    await page.getByRole("link", { name: "Today" }).click();
    await expect(page).toHaveURL(`/g/${group.groupId}`);
  });

  test("theme toggle flips light/dark and persists on reload", async ({
    page,
    context,
    baseURL,
  }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await page.goto(`/g/${group.groupId}`);

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });
});
