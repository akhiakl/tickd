import { test, expect } from "./fixtures/test";
import { seedFreshGroup, seedLoneUser } from "./fixtures/db";
import { signInAs } from "./fixtures/auth-session";

test.describe("join a group", () => {
  test("shows the signed-in account as the identity that will join", async ({
    page,
    context,
    baseURL,
  }) => {
    const user = await seedLoneUser("Joiner");
    await signInAs(context, user, baseURL!);

    await page.goto("/join");
    await expect(page.getByText(user.name)).toBeVisible();
    await expect(page.getByText("joining as this account")).toBeVisible();
  });

  test("an invalid code shows an inline error", async ({ page, context, baseURL }) => {
    const user = await seedLoneUser("Joiner");
    await signInAs(context, user, baseURL!);

    await page.goto("/join");
    await page.getByLabel("Invite code").fill("NOPE-0000");
    await page.getByRole("button", { name: "Join the group" }).click();

    await expect(page.getByText("No group matches that code.")).toBeVisible();
    await expect(page).toHaveURL("/join");
  });

  test("a valid code joins the group as a plain member", async ({ page, context, baseURL }) => {
    const group = await seedFreshGroup();
    const user = await seedLoneUser("Joiner");
    await signInAs(context, user, baseURL!);

    await page.goto("/join");
    await page.getByLabel("Invite code").fill(group.inviteCode);
    await page.getByRole("button", { name: "Join the group" }).click();

    await expect(page).toHaveURL(`/g/${group.groupId}`);
    await expect(page.getByText(group.groupName)).toBeVisible();

    await page.goto("/account");
    await expect(page.getByRole("link", { name: group.groupName })).toContainText("member");
  });

  test("prefills and upper-cases the code from a ?code= query param", async ({
    page,
    context,
    baseURL,
  }) => {
    const user = await seedLoneUser("Joiner");
    await signInAs(context, user, baseURL!);

    await page.goto("/join?code=lowercase-code");
    await expect(page.getByLabel("Invite code")).toHaveValue("LOWERCASE-CODE");
  });
});
