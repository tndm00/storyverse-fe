// Shared helpers for the Playwright browser-UI suite (see ../playwright.config.ts).
// These only drive the real app through the page — no direct `fetch` calls —
// mirroring scripts/e2e.mjs's scenarios but through actual UI interactions.

import { expect, type Browser, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@storyverse.local";
export const ADMIN_PASSWORD = "admin123";

// Same uniqueness strategy as scripts/e2e.mjs: a per-run timestamp suffix so
// repeated local runs never collide with existing rows in the dev database.
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000)}`;
}

// ---- reader-site account (register or log in) ----------------------------

export async function registerReader(
  page: Page,
  opts: { email: string; password: string; displayName: string },
): Promise<void> {
  await page.goto("/tai-khoan");
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await page.getByLabel("Tên hiển thị").fill(opts.displayName);
  await page.getByLabel("Email", { exact: true }).fill(opts.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(opts.password);
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.getByText(opts.email).waitFor();
}

// ---- become an author + quick-publish a story -----------------------------

// `password` matches the account just registered/logged-in with. A
// `page.goto` navigation (used throughout this suite) is a full page reload,
// which drops the in-memory password AuthProvider needs to silently refresh
// the token after the profile is created — so BecomeAuthorPage falls back to
// its "confirm your password" step, which this handles either way.
export async function becomeAuthor(
  page: Page,
  opts: { penName: string; password: string },
): Promise<void> {
  await page.goto("/tac-gia/dang-ky");
  await page.getByLabel("Bút danh").fill(opts.penName);
  await page.getByRole("button", { name: "Tạo hồ sơ tác giả" }).click();

  const confirmButton = page.getByRole("button", { name: "Xác nhận" });
  await Promise.race([page.waitForURL(/\/tac-gia$/), confirmButton.waitFor({ state: "visible" })]);
  if (await confirmButton.isVisible().catch(() => false)) {
    await page.getByLabel("Mật khẩu").fill(opts.password);
    await confirmButton.click();
    await page.waitForURL(/\/tac-gia$/);
  }
}

export interface QuickPublishResult {
  storySlug: string;
  storyId: string;
  chapterId: string;
}

// Publishes through /tac-gia/dang-truyen (the authed SubmitPage) and returns
// the ids from the real quick-publish response — used only to navigate
// straight to the right admin review item afterwards, not to skip any UI step.
export async function quickPublishAsAuthor(
  page: Page,
  opts: { title: string; content: string },
): Promise<QuickPublishResult> {
  await page.goto("/tac-gia/dang-truyen");
  // The pen-name field is pre-filled (read-only) once the author-profile check
  // resolves; wait for it so the submit button isn't still disabled.
  await expect(page.locator("#s-pen")).not.toHaveValue("");
  await page.locator("#s-title").fill(opts.title);
  await page.locator("#s-content").fill(opts.content);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/content/v1/stories/quick-publish")),
    page.locator(".cb-form-card form button[type='submit']").click(),
  ]);
  const body = await response.json();
  const data = body.data ?? body;
  return {
    storySlug: data.story.slug,
    storyId: data.story.id,
    chapterId: data.firstChapter.id,
  };
}

// ---- admin console ---------------------------------------------------

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(ADMIN_EMAIL);
  await page.getByTestId("login-password").fill(ADMIN_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(/\/console-7f2k$/);
}

// The pending-review queue is sorted oldest-first, so a freshly submitted
// chapter lands on the *last* page, not the first. Jump straight to the last
// page (its rightmost pager button) instead of scanning from page 1.
export async function openReviewItem(page: Page, chapterId: string): Promise<void> {
  await page.goto("/console-7f2k/review");
  await page.waitForLoadState("networkidle");
  const lastPageBtn = page.locator(".ant-pagination-item").last();
  if (await lastPageBtn.count()) {
    await lastPageBtn.click();
    await page.waitForLoadState("networkidle");
  }
  const row = page.getByTestId(`review-row-${chapterId}`);
  await row.waitFor({ state: "visible", timeout: 15_000 });
  await row.click();
  await page.waitForURL(new RegExp(`/console-7f2k/review/${chapterId}$`));
}

export async function startReviewAndApprove(page: Page): Promise<void> {
  await page.getByTestId("start-review").click();
  await expect(page.getByTestId("approve-publish")).toBeEnabled();
  await page.getByTestId("approve-publish").click();
}

export async function startReviewAndReject(page: Page, reason: string): Promise<void> {
  await page.getByTestId("start-review").click();
  await expect(page.getByTestId("reject")).toBeEnabled();
  await page.getByTestId("reject").click();
  await page.getByTestId("reason-input").fill(reason);
  await page.getByTestId("confirm-reject").click();
}

// Convenience wrapper around the login-as-admin -> find review item ->
// start+approve sequence duplicated across author-publish-and-review.spec.ts
// and reader-flows.spec.ts — runs in its own browser context so it never
// clobbers whatever session `page` (the caller's page) is using.
export async function approveChapterAsAdmin(browser: Browser, chapterId: string): Promise<void> {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    await startReviewAndApprove(adminPage);
    // Approve & publish navigates the admin to the Stories list on success.
    await adminPage.waitForURL(/\/console-7f2k\/stories$/);
  } finally {
    await adminContext.close();
  }
}

// Registers a reader, becomes an author, quick-publishes a story, and has an
// admin (separate context) approve its first chapter — used by specs that
// just need "a story with a Published chapter" as a starting point.
export async function publishAndApprove(
  page: Page,
  browser: Browser,
  opts: { title: string; content: string; penName: string; email: string; password: string },
): Promise<QuickPublishResult> {
  await registerReader(page, {
    email: opts.email,
    password: opts.password,
    displayName: opts.penName,
  });
  await becomeAuthor(page, { penName: opts.penName, password: opts.password });
  const result = await quickPublishAsAuthor(page, { title: opts.title, content: opts.content });
  await approveChapterAsAdmin(browser, result.chapterId);
  return result;
}
