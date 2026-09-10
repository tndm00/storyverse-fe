import { test, expect } from "@playwright/test";
import { registerReader, uniqueSuffix } from "./helpers";

// AccountPage (/tai-khoan) register mode: registering with an email that's
// already in use surfaces the backend's conflict error as a toast and leaves
// the form in register mode (doesn't silently log the visitor in as someone
// else). The exact backend error string isn't pinned here — just that it
// surfaces as an antd error toast.
test("registering with an email already in use shows an error and stays on the register form", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-dupe@storyverse.local`;
  const password = "Passw0rd!";

  await registerReader(page, { email, password, displayName: `E2E UI Dupe ${ts}` });
  await page.getByRole("button", { name: "Đăng xuất" }).click();

  await page.goto("/tai-khoan");
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Tên hiển thị").fill(`E2E UI Dupe Again ${ts}`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();

  await expect(page.locator(".ant-message-error")).toBeVisible();
  // Still in register mode, not silently logged in as the existing account.
  await expect(page.getByLabel("Tên hiển thị")).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toHaveCount(0);
});

// AccountPage (/tai-khoan) login mode, reader side: wrong password shows the
// same generic invalid-credentials message as the admin /login (same backend
// endpoint), and the visitor stays on the login form.
test("logging in on the reader-site AccountPage with the wrong password shows an error", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-wrongpw@storyverse.local`;
  const password = "Passw0rd!";

  await registerReader(page, { email, password, displayName: `E2E UI WrongPw ${ts}` });
  await page.getByRole("button", { name: "Đăng xuất" }).click();

  await page.goto("/tai-khoan");
  // Defaults to login mode.
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(`not-${password}`);
  // The segmented-control tab and the submit button both read "Đăng nhập" in
  // login mode — scope to the <form>'s own submit button to disambiguate.
  await page.locator("form button[type='submit']").click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/tai-khoan$/);
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
});
