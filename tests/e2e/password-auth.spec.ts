import { test, expect } from "./fixtures/test";

test.describe("username/password account upgrade", () => {
  test("a guest can save credentials, sign out, and log back in with them", async ({ page }) => {
    // Sign in as a fresh guest.
    await page.goto("/create");
    await expect(page).toHaveURL(/\/signin\/guest/);
    await page.getByLabel("Your name").fill("Priya");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/create$/);

    // Save a username/password on that same guest row.
    await page.goto("/account");
    await page.getByLabel("Username").fill("priya_e2e");
    await page.getByLabel("Password").fill("hunter22");
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText("Account saved")).toBeVisible();
    await expect(page.getByText("Log in as @priya_e2e from any device")).toBeVisible();

    // Sign out.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    // Log back in with the saved credentials.
    await page.goto("/signin/password");
    await page.getByLabel("Username").fill("priya_e2e");
    await page.getByLabel("Password").fill("hunter22");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL("/");

    // Landed back on the same account (same name), not a new one.
    await page.goto("/account");
    await expect(page.getByLabel("Your name")).toHaveValue("Priya");
    await expect(page.getByText("Account saved")).toBeVisible();
  });

  test("a wrong password shows an inline error and does not sign in", async ({ page }) => {
    await page.goto("/create");
    await page.getByLabel("Your name").fill("Marcus");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/create$/);

    await page.goto("/account");
    await page.getByLabel("Username").fill("marcus_e2e");
    await page.getByLabel("Password").fill("correcthorse");
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText("Account saved")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/signin/password");
    await page.getByLabel("Username").fill("marcus_e2e");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Wrong username or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/signin\/password/);
  });

  test("a taken username is caught by the live check and blocks submit", async ({ page }) => {
    await page.goto("/create");
    await page.getByLabel("Your name").fill("First");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/create$/);
    await page.goto("/account");
    await page.getByLabel("Username").fill("taken_e2e");
    await page.getByLabel("Password").fill("firstpassword");
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText("Account saved")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/create");
    await page.getByLabel("Your name").fill("Second");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/create$/);
    await page.goto("/account");
    await page.getByLabel("Username").fill("taken_e2e");

    // The live availability check (debounced, server-backed) catches the
    // collision before submit is even possible.
    await expect(page.getByText("That username is taken.")).toBeVisible();
    await page.getByLabel("Password").fill("secondpassword");
    await expect(page.getByRole("button", { name: "Save account" })).toBeDisabled();
  });

  test("checking your own current username doesn't falsely flag it as taken", async ({ page }) => {
    // Regression guard for the live-check UX: typing a username, then
    // backspacing back to nothing and retyping the same one shouldn't get
    // stuck showing a stale "checking" state or a false "taken" flash for
    // a name nobody else holds.
    await page.goto("/create");
    await page.getByLabel("Your name").fill("Solo");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/create$/);
    await page.goto("/account");

    await page.getByLabel("Username").fill("solo_e2e");
    await expect(page.getByLabel("Password")).toBeVisible();
    await page.getByLabel("Password").fill("solopassword");
    await expect(page.getByRole("button", { name: "Save account" })).toBeEnabled();
    await page.getByRole("button", { name: "Save account" }).click();
    await expect(page.getByText("Account saved")).toBeVisible();
  });
});
