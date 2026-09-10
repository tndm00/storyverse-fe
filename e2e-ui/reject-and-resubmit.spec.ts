import { test, expect } from "@playwright/test";
import {
  becomeAuthor,
  loginAsAdmin,
  openReviewItem,
  quickPublishAsAuthor,
  registerReader,
  startReviewAndReject,
  uniqueSuffix,
} from "./helpers";

// Self-contained: creates its own throwaway story + chapter rather than
// depending on another spec's state (mirrors scripts/e2e.mjs's "admin rejects
// a chapter, author resubmits" step, which also uses a fresh chapter 3).
test("admin rejects a pending chapter with a reason, author sees it and resubmits", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-reject@storyverse.local`;
  const title = `E2E UI Từ chối ${ts}`;
  const reason = `Thiếu nội dung, vui lòng bổ sung (${ts}).`;

  const password = "Passw0rd!";
  await registerReader(page, { email, password, displayName: `E2E UI Reject ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Reject ${ts}`, password });

  const { storySlug, chapterId } = await quickPublishAsAuthor(page, {
    title,
    content: "Bản nháp sẽ bị từ chối. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    await startReviewAndReject(adminPage, reason);
    // The modal (destroyOnClose) unmounts once the rejection succeeds.
    await expect(adminPage.getByTestId("reason-input")).toBeHidden();
  } finally {
    await adminContext.close();
  }

  // Back as the author: revisit the story's manage page.
  await page.goto(`/tac-gia/truyen/${storySlug}`);
  await expect(page.getByText("Bị từ chối").first()).toBeVisible();
  await expect(page.getByText(reason, { exact: false }).first()).toBeVisible();

  const resubmit = page.getByRole("button", { name: "Gửi lại duyệt" });
  await expect(resubmit).toBeVisible();
  await resubmit.click();

  await expect(page.getByText("Chờ duyệt")).toBeVisible();
});
