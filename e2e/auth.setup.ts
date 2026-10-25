import { test as setup, expect } from "@playwright/test";

// Logs in once through the real /login page and saves the session cookies
// to disk; the chromium project loads them (see playwright.config.ts), so
// the booking test starts already signed in as the dedicated e2e account.
// The account is seeded once against hotels-api, see
// ../hotels/.maestro/booking-flow.yaml for the curl.
export const authFile = "e2e/.auth/user.json";

setup("log in as the e2e user", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set E2E_USER_EMAIL and E2E_USER_PASSWORD (see .env.example)",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
