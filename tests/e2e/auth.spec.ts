import { test, expect } from "./fixtures/test";
import { FAKE_AUTH0_URL } from "./fixtures/constants";

test.describe("sign in", () => {
  test("protected route redirects straight to Auth0's hosted login, no in-app screen", async ({
    page,
  }) => {
    await page.goto("/create");

    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
    const url = new URL(page.url());
    expect(url.searchParams.get("client_id")).toBe("e2e-test-client");
  });

  test("the /signin pass-through route also redirects there directly", async ({ page }) => {
    await page.goto("/signin");

    await expect(page).toHaveURL(new RegExp(`^${FAKE_AUTH0_URL}/authorize`));
  });
});
