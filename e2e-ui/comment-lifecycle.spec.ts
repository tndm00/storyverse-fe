import { test, expect } from "@playwright/test";
import { publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// Full comment lifecycle on a chapter reader page, as a single reader account:
// post a root comment, reply to it (self-reply — communityService.replyToComment
// doesn't care who the parent author is), edit the root comment in place, then
// delete it. Self-contained: publishes + approves its own story to comment on.
test("reader can post, reply to, edit, and delete their own comment", async ({
  browser,
  page,
}) => {
  // Publish+approve (register, become author, publish, admin approve) plus a
  // full comment/reply/edit/delete sequence comfortably exceeds the 30s default.
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const commentText = `Bình luận gốc của tôi (${ts})`;
  const replyText = `Trả lời chính bình luận của tôi (${ts})`;
  const editedText = `Bình luận đã được chỉnh sửa (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-comments@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Comments ${ts}`,
    title: `E2E UI Bình luận ${ts}`,
    content: "Nội dung chương để bình luận vào. ".repeat(10),
  });

  // A separate reader context — the publishing author account works fine too,
  // but a fresh reader keeps this spec independent of the author flow above.
  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-comments-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Comments Reader ${ts}`,
    });
    await readerPage.goto(`/story/${storySlug}`);
    await readerPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));

    // ---- post the root comment -----------------------------------------
    await readerPage
      .getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…")
      .fill(commentText);
    await readerPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(readerPage.getByText(commentText)).toBeVisible();

    // Scoped to the top-level list so later steps never touch the nested
    // reply's own (also "mine") Sửa/Xoá buttons — `> selector` binds directly
    // to this <li>'s children, not descendants further down the tree. `.first()`
    // rather than `.filter({ hasText: commentText })`: the edit step below
    // replaces that very text, which would make a hasText-filtered locator
    // stop matching anything once the edit lands. This is the only comment
    // posted in this test, so "the first (only) root comment" is unambiguous.
    const rootLi = readerPage.locator("ul.cb-comment-list > li.cb-comment").first();
    const rootActions = rootLi.locator("> .cb-comment-actions");

    // ---- reply to it -----------------------------------------------------
    await rootActions.getByRole("button", { name: "Trả lời" }).click();
    const replyBox = rootLi.locator("> .cb-reply-box");
    await replyBox.getByPlaceholder("Viết trả lời…").fill(replyText);
    await replyBox.getByRole("button", { name: "Gửi" }).click();
    await expect(rootLi.locator(".cb-comment-replies")).toContainText(replyText);

    // ---- edit the root comment --------------------------------------------
    await rootActions.getByRole("button", { name: "Sửa" }).click();
    const editTextarea = rootLi.locator("> textarea.cb-input");
    await editTextarea.fill(editedText);
    await rootLi.locator("> .cb-cta-actions").getByRole("button", { name: "Lưu" }).click();
    await expect(rootLi.locator("> p.cb-comment-body")).toHaveText(editedText);
    await expect(readerPage.getByText(commentText)).toHaveCount(0);

    // ---- delete the root comment -------------------------------------------
    // CommentItem has a "[đã xoá]" placeholder branch for a Deleted node, but
    // it's unreachable with the real backend: GetVisibleByChapterAsync
    // (Community.Infrastructure/Repositories/CommentRepository.cs) filters
    // comments down to `Status == Visible` before they're ever returned, so a
    // deleted comment simply vanishes from the list entirely instead of
    // showing that placeholder. Its reply — now parentless in the fetched
    // set — gets promoted to a root-level entry by the FE's own tree-building
    // (`byId.has(n.parentId)` is false once the parent is gone).
    await rootActions.getByRole("button", { name: "Xoá" }).click();
    await expect(readerPage.getByText(editedText)).toHaveCount(0);
    await expect(readerPage.getByText(replyText)).toBeVisible();
  } finally {
    await readerContext.close();
  }
});

// NOTE on the plan's original ask ("reply-to-a-reply renders a 3-level nested
// thread"): the backend explicitly forbids this — ReplyCommentCommandHandler
// (Community.Application/Commands/Comments/ReplyComment/ReplyCommentCommandHandler.cs)
// throws BusinessRuleException(ApplicationErrorConstants.CannotReplyToReply)
// ("Replies can only be made on a top-level comment.") whenever the target
// comment's own ParentCommentId is non-null — so a genuine 3-level thread is
// not achievable through the real API at all; it's a real (undocumented in
// the FE) 2-level-only constraint, not a bug to route around. The CommentItem
// component itself has no depth check and still renders a "Trả lời" button on
// a reply node, so this test instead covers the real, previously-untested
// behavior: attempting to reply to a reply is rejected with that business
// error, and no such nested reply is ever created.
test("replying to a reply is rejected by the backend's top-level-only rule", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const rootText = `Gốc cấp 1 (${ts})`;
  const level2Text = `Trả lời cấp 2 (${ts})`;
  const level3Text = `Trả lời cấp 3 sẽ bị từ chối (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-nestreply-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh NestReply ${ts}`,
    title: `E2E UI Luồng lồng nhau ${ts}`,
    content: "Truyện để thử giới hạn trả lời chỉ một cấp. ".repeat(10),
  });

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-nestreply-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI NestReply Reader ${ts}`,
    });
    await readerPage.goto(`/story/${storySlug}`);
    await readerPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));

    // ---- root comment ---------------------------------------------------
    await readerPage
      .getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…")
      .fill(rootText);
    await readerPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(readerPage.getByText(rootText)).toBeVisible();

    const rootLi = readerPage.locator("ul.cb-comment-list > li.cb-comment").first();

    // ---- level 2: reply to the root (allowed) ----------------------------
    await rootLi.locator("> .cb-comment-actions").getByRole("button", { name: "Trả lời" }).click();
    const rootReplyBox = rootLi.locator("> .cb-reply-box");
    await rootReplyBox.getByPlaceholder("Viết trả lời…").fill(level2Text);
    await rootReplyBox.getByRole("button", { name: "Gửi" }).click();
    await expect(rootLi.locator("> .cb-comment-replies")).toContainText(level2Text);

    const level2Li = rootLi
      .locator("> .cb-comment-replies > li.cb-comment")
      .filter({ hasText: level2Text });
    await expect(level2Li).toBeVisible();

    // ---- attempted level 3: reply to the level-2 reply (rejected) --------
    // CommentItem doesn't guard against this in the UI — the "Trả lời"
    // button is still there on a reply node — so the rejection has to come
    // from the backend's own business rule.
    await level2Li.locator("> .cb-comment-actions").getByRole("button", { name: "Trả lời" }).click();
    const level2ReplyBox = level2Li.locator("> .cb-reply-box");
    await level2ReplyBox.getByPlaceholder("Viết trả lời…").fill(level3Text);
    await level2ReplyBox.getByRole("button", { name: "Gửi" }).click();

    await expect(
      readerPage.getByText("Replies can only be made on a top-level comment."),
    ).toBeVisible();

    // No 3rd-level reply was created. useAsyncRunner's `run()` only calls
    // `onChanged` (refetch) on success, so a failed submit leaves the page's
    // in-memory comment tree untouched — including the still-open reply
    // textarea, which still holds the typed (never-sent) draft. Reload to
    // fetch the real, current state fresh from the backend instead of
    // reasoning about that stale, mid-edit DOM.
    await readerPage.reload();
    await expect(readerPage.getByRole("heading", { name: "Bình luận (2)" })).toBeVisible();

    const reloadedRootLi = readerPage.locator("ul.cb-comment-list > li.cb-comment").first();
    const reloadedLevel2Li = reloadedRootLi
      .locator("> .cb-comment-replies > li.cb-comment")
      .filter({ hasText: level2Text });
    await expect(reloadedLevel2Li).toBeVisible();
    // Level 2 has no nested replies of its own, and the rejected level-3 text
    // was never persisted anywhere.
    await expect(reloadedLevel2Li.locator(".cb-comment-replies")).toHaveCount(0);
    await expect(readerPage.getByText(level3Text)).toHaveCount(0);
  } finally {
    await readerContext.close();
  }
});

// A second reader account never sees Sửa/Xoá on someone else's comment — only
// the author (node.mine) does. "Trả lời" is still available to any signed-in
// reader.
test("another reader sees no edit/delete controls on someone else's comment", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const commentText = `Bình luận của người khác (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-notmine-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh NotMine ${ts}`,
    title: `E2E UI Không phải của tôi ${ts}`,
    content: "Truyện để thử quyền sửa/xoá bình luận. ".repeat(10),
  });

  const aContext = await browser.newContext();
  const bContext = await browser.newContext();
  const aPage = await aContext.newPage();
  const bPage = await bContext.newPage();
  try {
    await registerReader(aPage, {
      email: `e2e-ui+${ts}-notmine-a@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI NotMine Reader A ${ts}`,
    });
    await registerReader(bPage, {
      email: `e2e-ui+${ts}-notmine-b@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI NotMine Reader B ${ts}`,
    });

    await aPage.goto(`/story/${storySlug}`);
    await aPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await aPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    const chapterUrl = aPage.url();

    await aPage.getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…").fill(commentText);
    await aPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(aPage.getByText(commentText)).toBeVisible();

    // Reader A (the author) sees Sửa + Xoá on their own comment.
    const aRootLi = aPage.locator("ul.cb-comment-list > li.cb-comment").filter({ hasText: commentText });
    const aActions = aRootLi.locator("> .cb-comment-actions");
    await expect(aActions.getByRole("button", { name: "Sửa" })).toBeVisible();
    await expect(aActions.getByRole("button", { name: "Xoá" })).toBeVisible();

    // Reader B visits the same chapter: same comment, but no Sửa/Xoá — only
    // "Trả lời" (they're signed in, just not the author).
    await bPage.goto(chapterUrl);
    const bRootLi = bPage.locator("ul.cb-comment-list > li.cb-comment").filter({ hasText: commentText });
    const bActions = bRootLi.locator("> .cb-comment-actions");
    await expect(bActions.getByRole("button", { name: "Trả lời" })).toBeVisible();
    await expect(bActions.getByRole("button", { name: "Sửa" })).toHaveCount(0);
    await expect(bActions.getByRole("button", { name: "Xoá" })).toHaveCount(0);
  } finally {
    await aContext.close();
    await bContext.close();
  }
});

// A freshly-published chapter starts with zero comments (empty state + "(0)"
// count), and posting the first one flips both.
test("a fresh chapter shows the empty comment state, and the count updates from 0 to 1", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const commentText = `Bình luận đầu tiên trên chương mới (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-emptystate@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Empty ${ts}`,
    title: `E2E UI Chương trống ${ts}`,
    content: "Truyện dùng để kiểm tra trạng thái chưa có bình luận. ".repeat(10),
  });

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-emptystate-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Empty Reader ${ts}`,
    });
    await readerPage.goto(`/story/${storySlug}`);
    await readerPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));

    await expect(readerPage.getByRole("heading", { name: "Bình luận (0)" })).toBeVisible();
    await expect(readerPage.getByText("Chưa có bình luận nào.")).toBeVisible();

    await readerPage
      .getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…")
      .fill(commentText);
    await readerPage.getByRole("button", { name: "Đăng bình luận" }).click();

    await expect(readerPage.getByRole("heading", { name: "Bình luận (1)" })).toBeVisible();
    await expect(readerPage.getByText("Chưa có bình luận nào.")).toHaveCount(0);
    await expect(readerPage.getByText(commentText)).toBeVisible();
  } finally {
    await readerContext.close();
  }
});

// Deleting a comment removes it entirely (real backend filters non-Visible
// rows out server-side — see the delete-lifecycle test above), so the whole
// action row (Trả lời/Sửa/Xoá), not just the visible text, goes with it —
// true both for the deleter and for a completely different visitor.
test("after deleting a comment, its whole action row disappears for the deleter and for another visitor", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const commentText = `Bình luận sẽ bị xoá hoàn toàn (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-delrow-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh DelRow ${ts}`,
    title: `E2E UI Xoá hàng thao tác ${ts}`,
    content: "Truyện để thử việc xoá toàn bộ hàng thao tác bình luận. ".repeat(10),
  });

  const aContext = await browser.newContext();
  const bContext = await browser.newContext();
  const aPage = await aContext.newPage();
  const bPage = await bContext.newPage();
  try {
    await registerReader(aPage, {
      email: `e2e-ui+${ts}-delrow-a@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI DelRow Reader A ${ts}`,
    });
    await registerReader(bPage, {
      email: `e2e-ui+${ts}-delrow-b@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI DelRow Reader B ${ts}`,
    });

    await aPage.goto(`/story/${storySlug}`);
    await aPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await aPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    const chapterUrl = aPage.url();

    await aPage.getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…").fill(commentText);
    await aPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(aPage.getByText(commentText)).toBeVisible();

    // Reader B loads the page before the delete: the comment (and its action
    // row) is there.
    await bPage.goto(chapterUrl);
    const bRootLi = bPage.locator("ul.cb-comment-list > li.cb-comment").filter({ hasText: commentText });
    await expect(bRootLi.locator("> .cb-comment-actions")).toBeVisible();

    // Reader A (the owner) deletes it.
    const aRootLi = aPage.locator("ul.cb-comment-list > li.cb-comment").filter({ hasText: commentText });
    await aRootLi.locator("> .cb-comment-actions").getByRole("button", { name: "Xoá" }).click();

    // For the deleter: the whole <li> — text and action row alike — is gone.
    await expect(aPage.locator("li.cb-comment").filter({ hasText: commentText })).toHaveCount(0);
    await expect(aPage.getByRole("button", { name: "Xoá" })).toHaveCount(0);

    // For the other visitor, reloading shows the same: gone entirely.
    await bPage.reload();
    await expect(bPage.locator("li.cb-comment").filter({ hasText: commentText })).toHaveCount(0);
  } finally {
    await aContext.close();
    await bContext.close();
  }
});
