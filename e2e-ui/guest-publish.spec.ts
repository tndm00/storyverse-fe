import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

// Anonymous visitor publishes a story through /submit without logging in.
// Mirrors scripts/e2e.mjs's "guest publish (anonymous, no token)" step, but
// through the real form instead of a direct POST.
test("guest can publish a story from /submit while logged out", async ({ page }) => {
  const ts = uniqueSuffix();
  const title = `E2E UI Khách ${ts}`;
  const penName = `Khách UI ${ts}`;

  await page.goto("/submit");

  await page.locator("#s-title").fill(title);
  await page.locator("#s-pen").fill(penName);
  // #s-genre keeps its default ("sang-tac") once genres have loaded.
  await expect(page.locator("#s-genre option")).not.toHaveCount(0);
  await page
    .locator("#s-content")
    .fill("Không cần đăng nhập vẫn đăng được truyện. ".repeat(10));

  await page.locator(".cb-form-card form button[type='submit']").click();

  await expect(page.getByRole("heading", { name: "Đã gửi duyệt" })).toBeVisible();
  await expect(page.getByText(title, { exact: false })).toBeVisible();
  await expect(page.getByText("đang chờ duyệt", { exact: false })).toBeVisible();
});
