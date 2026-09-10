import { test, expect } from "@playwright/test";
import { publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// RequireAuth's `requireAdminConsole` check: an authenticated reader with no
// admin-console role hitting an admin route is SILENTLY redirected home (no
// toast, no "access denied" page) — src/auth/RequireAuth.tsx:37-39. This is
// the one test that would catch that guard failing open (e.g. rendering the
// admin page anyway, or leaking an error instead of a clean redirect).
test("an authenticated non-admin reader is silently redirected away from an admin route", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  await registerReader(page, {
    email: `e2e-ui+${ts}-guard-admin@storyverse.local`,
    password: "Passw0rd!",
    displayName: `E2E UI Guard ${ts}`,
  });

  await page.goto("/console-7f2k/stories");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".ant-message")).toHaveCount(0);
  await expect(page.locator(".ant-notification")).toHaveCount(0);
  await expect(page.getByTestId("login-email")).toHaveCount(0);
});

// AuthorGuard: a logged-in reader with no author profile yet hitting /tac-gia
// is redirected to the onboarding page instead of an error or blank state.
test("a logged-in reader with no author profile hitting /tac-gia is redirected to onboarding", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  await registerReader(page, {
    email: `e2e-ui+${ts}-guard-author@storyverse.local`,
    password: "Passw0rd!",
    displayName: `E2E UI Guard Author ${ts}`,
  });

  await page.goto("/tac-gia");
  await page.waitForURL(/\/tac-gia\/dang-ky$/);
  await expect(page.getByRole("heading", { name: "Trở thành người kể chuyện" })).toBeVisible();
});

test("an unknown story slug renders the 404 page", async ({ page }) => {
  await page.goto(`/story/does-not-exist-${uniqueSuffix()}`);
  await expect(page.getByText("This page does not exist.")).toBeVisible();
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("an unknown chapter id under a real story renders the 404 page", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-404chapter@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh 404 ${ts}`,
    title: `E2E UI 404 Chương ${ts}`,
    content: "Truyện dùng để kiểm tra 404 chương không tồn tại. ".repeat(10),
  });

  await page.goto(`/story/${storySlug}/chapter/999999`);
  await expect(page.getByText("This page does not exist.")).toBeVisible();
});

test("an unknown author id renders the 404 page", async ({ page }) => {
  await page.goto("/author/999999999");
  await expect(page.getByText("This page does not exist.")).toBeVisible();
});
