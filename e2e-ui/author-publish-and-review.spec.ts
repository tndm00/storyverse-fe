import { test, expect } from "@playwright/test";
import {
  becomeAuthor,
  loginAsAdmin,
  openReviewItem,
  quickPublishAsAuthor,
  registerReader,
  startReviewAndApprove,
  uniqueSuffix,
} from "./helpers";

// Full happy path: an author registers, publishes a story, and an admin
// approves the pending chapter through the review queue — asserted at every
// step through the rendered UI, mirroring scripts/e2e.mjs's
// "quick-publish story" + "admin approves chapter 1" steps.
test("author publishes a story and admin approves it through the review queue", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-author@storyverse.local`;
  const title = `E2E UI Truyện ${ts}`;

  const password = "Passw0rd!";
  await registerReader(page, { email, password, displayName: `E2E UI Author ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh ${ts}`, password });

  const { storySlug, chapterId } = await quickPublishAsAuthor(page, {
    title,
    content: "Đêm đó tôi nghe tiếng gõ cửa. ".repeat(20),
  });

  // Success screen -> jump straight to the story's manage page.
  await page.getByRole("link", { name: "Thêm chương / phần" }).click();
  await page.waitForURL(new RegExp(`/tac-gia/truyen/${storySlug}$`));
  await expect(page.getByText("Chờ duyệt")).toBeVisible();

  // Admin reviews and approves in a separate browser context — logging in as
  // admin on this same page would overwrite the author's session token.
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    await startReviewAndApprove(adminPage);

    // Approve & publish navigates the admin to the Stories list on success.
    await adminPage.waitForURL(/\/console-7f2k\/stories$/);
    await adminPage.getByPlaceholder("Search title or author").fill(title);
    await adminPage.getByPlaceholder("Search title or author").press("Enter");
    await expect(adminPage.getByText(title, { exact: false })).toBeVisible();
  } finally {
    await adminContext.close();
  }

  // Back on the reader site (still the author's session): the story is now
  // publicly visible.
  await page.goto(`/story/${storySlug}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/browse");
  await expect(page.getByText(title, { exact: false })).toBeVisible();
});
