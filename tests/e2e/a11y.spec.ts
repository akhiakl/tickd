import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures/test";
import { seedFreshGroup } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

/**
 * Automated accessibility scan (axe-core) of one representative page per
 * screen, both signed out and signed in. This catches structural/contrast/
 * ARIA issues automatically; it is not a substitute for manual keyboard and
 * screen-reader passes, which axe itself cannot do.
 */

async function expectNoViolations(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = results.violations
    .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
    .join("\n");
  expect(results.violations, summary).toEqual([]);
}

test.describe("accessibility", () => {
  test("landing page", async ({ page }) => {
    await expectNoViolations(page, "/");
  });

  test("sign-in page", async ({ page }) => {
    await expectNoViolations(page, "/login");
  });

  test("email code page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@email.com").fill("a11y@example.com");
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page).toHaveURL(/\/login\/code/);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("account settings", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, "/account");
  });

  test("create group", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, "/create");
  });

  test("join group", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, "/join");
  });

  test("Today dashboard", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, `/g/${group.groupId}`);
  });

  test("the wall", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, `/g/${group.groupId}/wall`);
  });

  test("standings", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, `/g/${group.groupId}/ranks`);
  });

  test("member profile", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup({ historyDays: 4 });
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, `/g/${group.groupId}/members/${group.members[0].id}`);
  });

  test("group settings", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    await signInAs(context, group.admin, baseURL!);
    await expectNoViolations(page, `/g/${group.groupId}/settings`);
  });
});
