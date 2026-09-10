import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAsAdmin, registerReader, uniqueSuffix } from "./helpers";

// Reader-site logout from /tai-khoan: the account panel disappears and the
// login/register form reappears.
test("reader can log out from the account page", async ({ page }) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-logout@storyverse.local`;
  const password = "Passw0rd!";

  await registerReader(page, { email, password, displayName: `E2E UI Logout ${ts}` });
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  // AccountPage keeps whichever login/register `mode` it was last in (it
  // doesn't reset on logout), so assert the login/register form is back —
  // not a specific heading text ("Đăng ký" vs "Đăng nhập" — this account
  // registered, so it's still "Đăng ký").
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toHaveCount(0);
});

// Admin console logout via the header avatar dropdown's "Log out" item.
test("admin can log out from the console sidebar/header menu", async ({ page }) => {
  await loginAsAdmin(page);

  // The avatar dropdown is click-triggered (AdminLayout.tsx sets
  // trigger={["click"]} specifically to avoid hover-trigger flakiness in
  // headless runs) — click it open, then click "Log out" in the menu.
  await page.locator(".ant-avatar").click();
  const logOut = page.getByText("Log out");
  await expect(logOut).toBeVisible({ timeout: 10_000 });
  await logOut.click();
  await page.waitForURL(/\/login$/);
  await expect(page.getByTestId("login-email")).toBeVisible();
});

// A Reader-role (non-admin/non-moderator) account is rejected at the admin
// /login with MESSAGES.auth.notAllowed, and is logged out again immediately
// (LoginPage's onFinish calls logout() right after the failed role check).
test("a reader-role account is rejected at the admin login with 'not allowed'", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-notallowed@storyverse.local`;
  const password = "Passw0rd!";

  // Register on the reader site first (a plain Reader has no admin-console role).
  await registerReader(page, { email, password, displayName: `E2E UI NotAllowed ${ts}` });
  await page.getByRole("button", { name: "Đăng xuất" }).click();

  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  await expect(
    page.getByText("This account is not allowed in the admin console."),
  ).toBeVisible();
  // Logged out again: the login form is still here, not the admin console.
  await expect(page.getByTestId("login-email")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

// Wrong password at the admin /login shows the generic invalid-credentials
// error (the backend returns the same message for "no such user" and "wrong
// password", to avoid leaking which emails are registered).
test("admin login with the wrong password shows an invalid-credentials error", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(ADMIN_EMAIL);
  await page.getByTestId("login-password").fill(`not-${ADMIN_PASSWORD}`);
  await page.getByTestId("login-submit").click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
