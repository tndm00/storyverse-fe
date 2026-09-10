import { test, expect } from "@playwright/test";
import { publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// The notification bell (src/site/components/NotificationBell.tsx) has no
// server-side event bus yet — nothing on the backend produces notifications
// on its own. The one UI-triggerable path that does create a real one is
// communityService.replyToComment's dev "reply shim": replying to someone
// else's comment posts a CommentReply notification for the parent's author.
// So: reader A comments, reader B replies twice (two separate root comments,
// so two distinct notifications), then reader A opens the bell and works
// through it — see one, mark one read, mark the rest read.
test("notification bell shows, marks read, and marks all read a real reply notification", async ({
  browser,
  page,
}) => {
  // publishAndApprove + two reader contexts each posting/replying twice.
  test.setTimeout(90_000);

  const ts = uniqueSuffix();
  const commentText1 = `Bình luận đầu tiên của A (${ts})`;
  const commentText2 = `Bình luận thứ hai của A (${ts})`;
  const replyText1 = `B trả lời bình luận đầu (${ts})`;
  const replyText2 = `B trả lời bình luận hai (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-notif-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Notif ${ts}`,
    title: `E2E UI Thông báo ${ts}`,
    content: "Truyện để thử thông báo trả lời bình luận. ".repeat(10),
  });

  const aContext = await browser.newContext();
  const bContext = await browser.newContext();
  const aPage = await aContext.newPage();
  const bPage = await bContext.newPage();
  try {
    await registerReader(aPage, {
      email: `e2e-ui+${ts}-notif-a@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Notif Reader A ${ts}`,
    });
    await registerReader(bPage, {
      email: `e2e-ui+${ts}-notif-b@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Notif Reader B ${ts}`,
    });

    // Reader A posts two root comments.
    await aPage.goto(`/story/${storySlug}`);
    await aPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await aPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    const chapterUrl = aPage.url();

    const commentBox = aPage.getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…");
    const postButton = aPage.getByRole("button", { name: "Đăng bình luận" });
    await commentBox.fill(commentText1);
    await postButton.click();
    await expect(aPage.getByText(commentText1)).toBeVisible();
    // The textarea only clears once the first post's onSuccess has actually
    // committed (`setDraft("")`); filling the second comment before that
    // commit lands can get clobbered by it. Wait for the clear first.
    await expect(commentBox).toHaveValue("");
    await commentBox.fill(commentText2);
    await postButton.click();
    await expect(aPage.getByText(commentText2)).toBeVisible();

    // Reader B replies to both — each reply fires the dev CommentReply
    // notification shim for A (the parent's author).
    await bPage.goto(chapterUrl);
    for (const [commentText, replyText] of [
      [commentText1, replyText1],
      [commentText2, replyText2],
    ] as const) {
      const commentLi = bPage
        .locator("ul.cb-comment-list > li.cb-comment")
        .filter({ hasText: commentText });
      await commentLi.locator("> .cb-comment-actions").getByRole("button", { name: "Trả lời" }).click();
      const replyBox = commentLi.locator("> .cb-reply-box");
      await replyBox.getByPlaceholder("Viết trả lời…").fill(replyText);
      await replyBox.getByRole("button", { name: "Gửi" }).click();
      await expect(commentLi.locator(".cb-comment-replies")).toContainText(replyText);
    }

    // Back to reader A: a full reload remounts NotificationBell so its
    // unread-count effect runs immediately, instead of waiting on its 60s poll.
    await aPage.reload();
    const bell = aPage.getByRole("button", { name: "Thông báo" });
    await expect(bell.getByText("2", { exact: true })).toBeVisible();

    await bell.click();
    const menu = aPage.getByRole("menu");
    await expect(menu.getByText("Có người trả lời bình luận của bạn").first()).toBeVisible();
    await expect(menu.getByText(replyText1)).toBeVisible();
    await expect(menu.getByText(replyText2)).toBeVisible();

    // Clicking the first unread row both marks it read AND navigates (both
    // notifications here are refType "Chapter", resolving to `chapterUrl` —
    // see feature-gaps.spec.ts's "clicking a reply notification navigates..."
    // test), which also closes the menu. Its unread dot count still drops to 1.
    await menu.locator(".cb-notif-row.is-unread").first().click();
    await aPage.waitForURL(chapterUrl);
    await expect(menu).toBeHidden();
    await expect(bell.getByText("1", { exact: true })).toBeVisible();

    // Re-open the bell: exactly one row is still unread.
    await bell.click();
    await expect(menu.locator(".cb-notif-row.is-unread")).toHaveCount(1);

    // Mark all remaining read: the bell's unread badge disappears entirely,
    // and the "mark all read" button (only shown while something is unread)
    // goes with it.
    await menu.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }).click();
    await expect(menu.locator(".cb-notif-row.is-unread")).toHaveCount(0);
    await expect(bell.locator(".cb-notif-dot")).toHaveCount(0);
    await expect(menu.getByRole("button", { name: "Đánh dấu tất cả đã đọc" })).toHaveCount(0);
  } finally {
    await aContext.close();
    await bContext.close();
  }
});
