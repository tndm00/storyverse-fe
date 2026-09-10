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

// Self-contained: publishes + approves its own story so it has a real
// published chapter to comment on, rate, and shelve — then exercises those
// reader actions as a separate reader account, asserting each one reflects
// back in the UI (comment list, rating widget, library shelf).
test("reader can comment, rate, and add a published story to their library", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const authorEmail = `e2e-ui+${ts}-rf-author@storyverse.local`;
  const readerEmail = `e2e-ui+${ts}-rf-reader@storyverse.local`;
  const title = `E2E UI Đọc giả ${ts}`;
  const commentText = `Chương này rợn thật! (${ts})`;

  // Author publishes + admin approves (separate contexts throughout, since a
  // login on the reader-site shares the same localStorage token per context).
  const authorPassword = "Passw0rd!";
  await registerReader(page, {
    email: authorEmail,
    password: authorPassword,
    displayName: `E2E UI RF Author ${ts}`,
  });
  await becomeAuthor(page, { penName: `E2E UI Bút danh RF ${ts}`, password: authorPassword });
  const { storySlug, chapterId } = await quickPublishAsAuthor(page, {
    title,
    content: "Đêm đó tôi nghe tiếng gõ cửa. ".repeat(20),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    await startReviewAndApprove(adminPage);
  } finally {
    await adminContext.close();
  }

  // Reader account, in its own context.
  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: readerEmail,
      password: "Passw0rd!",
      displayName: `E2E UI Reader ${ts}`,
    });

    await readerPage.goto(`/story/${storySlug}`);
    await expect(readerPage.getByRole("heading", { name: title })).toBeVisible();

    // Comment on the first chapter.
    await readerPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    await readerPage
      .getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…")
      .fill(commentText);
    await readerPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(readerPage.getByText(commentText)).toBeVisible();

    // Rate the story and add it to the library, back on the story page.
    await readerPage.goto(`/story/${storySlug}`);
    await readerPage.getByRole("button", { name: "5 sao" }).click();
    await readerPage.getByRole("button", { name: "Gửi đánh giá" }).click();
    await expect(readerPage.getByRole("button", { name: "Cập nhật đánh giá" })).toBeVisible();

    await readerPage.getByRole("button", { name: "＋ Thêm vào tủ" }).click();
    // AddToLibraryButton swaps to a shelf <select> + "Xoá" button once added.
    await expect(readerPage.getByRole("button", { name: "Xoá" })).toBeVisible();

    // Library shows the story under a shelf.
    await readerPage.goto("/library");
    await expect(readerPage.getByText(title, { exact: false }).first()).toBeVisible();
  } finally {
    await readerContext.close();
  }
});
