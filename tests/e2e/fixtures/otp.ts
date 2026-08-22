import type { Page } from "@playwright/test";

/** Types a code into the custom on-screen keypad used by /login/code. */
export async function enterOtpDigits(page: Page, digits: string) {
  for (const digit of digits) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}
