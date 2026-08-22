import { test, expect } from "./fixtures/test";
import { TEST_OTP_CODE, FAKE_AUTH0_URL } from "./fixtures/constants";
import { enterOtpDigits } from "./fixtures/otp";

function freshEmail() {
  return `e2e-${crypto.randomUUID().slice(0, 8)}@example.com`;
}

test.describe("sign in", () => {
  test("email code: happy path signs a brand-new user in", async ({ page }) => {
    const email = freshEmail();

    await page.goto("/login");
    await page.getByPlaceholder("you@email.com").fill(email);
    await page.getByRole("button", { name: "Send me a code" }).click();

    await expect(page).toHaveURL(/\/login\/code/);
    await expect(page.getByText(email)).toBeVisible();

    await enterOtpDigits(page, TEST_OTP_CODE);
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(page).toHaveURL("/");
    // A brand-new user has no groups yet, but the sign-in itself succeeded:
    // visiting another protected route no longer bounces to /login.
    await page.goto("/account");
    await expect(page).toHaveURL("/account");
    await expect(page.getByLabel("Your name")).toHaveValue(email.split("@")[0]);
  });

  test("preserves the callbackUrl through the whole sign-in flow", async ({ page }) => {
    const email = freshEmail();

    await page.goto("/create");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcreate/);

    await page.getByPlaceholder("you@email.com").fill(email);
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page).toHaveURL(/callbackUrl=%2Fcreate/);

    await enterOtpDigits(page, TEST_OTP_CODE);
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(page).toHaveURL("/create");
  });

  test("wrong code shows an inline error and does not sign in", async ({ page }) => {
    const email = freshEmail();

    await page.goto("/login");
    await page.getByPlaceholder("you@email.com").fill(email);
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page).toHaveURL(/\/login\/code/);

    await enterOtpDigits(page, "000000");
    await page.getByRole("button", { name: "Verify" }).click();

    await expect(page.getByText("That code didn't match")).toBeVisible();
    await expect(page).toHaveURL(/\/login\/code/);
  });

  test("resend shows a confirmation notice", async ({ page }) => {
    const email = freshEmail();

    await page.goto("/login");
    await page.getByPlaceholder("you@email.com").fill(email);
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page).toHaveURL(/\/login\/code/);

    await page.getByRole("button", { name: "Send it again" }).click();
    await expect(page.getByRole("button", { name: "New code sent" })).toBeVisible();
  });

  test("Apple and WhatsApp are shown but disabled", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Coming soon: Apple/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Coming soon: WhatsApp/ })).toBeDisabled();
  });

  test("Google starts a real OAuth redirect to Auth0's authorize endpoint", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Continue with Google/ }).click();

    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
    const url = new URL(page.url());
    expect(url.searchParams.get("connection")).toBe("google-oauth2");
    expect(url.searchParams.get("client_id")).toBe("e2e-test-client");
  });
});
