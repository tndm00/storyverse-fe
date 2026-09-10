import { test, expect } from "@playwright/test";
import {
  approveChapterAsAdmin,
  becomeAuthor,
  publishAndApprove,
  quickPublishAsAuthor,
  registerReader,
  uniqueSuffix,
} from "./helpers";

// Feature 1: clicking a notification row navigates to its target.
// The only real notification-producing path today is the dev "reply shim"
// in communityService.replyToComment (see notifications.spec.ts) — a reply
// notifies the parent comment's author with refType "Chapter" / refId the
// chapter id, so clicking it should land the reader on that chapter's page.
test("clicking a reply notification navigates to the chapter it's about", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const commentText = `Bình luận gốc cần trả lời (${ts})`;
  const replyText = `Đây là câu trả lời (${ts})`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-navnotif-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh NavNotif ${ts}`,
    title: `E2E UI Điều hướng thông báo ${ts}`,
    content: "Truyện để thử điều hướng khi bấm thông báo. ".repeat(10),
  });

  const aContext = await browser.newContext();
  const bContext = await browser.newContext();
  const aPage = await aContext.newPage();
  const bPage = await bContext.newPage();
  try {
    await registerReader(aPage, {
      email: `e2e-ui+${ts}-navnotif-a@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI NavNotif Reader A ${ts}`,
    });
    await registerReader(bPage, {
      email: `e2e-ui+${ts}-navnotif-b@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI NavNotif Reader B ${ts}`,
    });

    await aPage.goto(`/story/${storySlug}`);
    await aPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await aPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    const chapterUrl = aPage.url();

    const commentBox = aPage.getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…");
    await commentBox.fill(commentText);
    await aPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(aPage.getByText(commentText)).toBeVisible();

    await bPage.goto(chapterUrl);
    const commentLi = bPage
      .locator("ul.cb-comment-list > li.cb-comment")
      .filter({ hasText: commentText });
    await commentLi.locator("> .cb-comment-actions").getByRole("button", { name: "Trả lời" }).click();
    const replyBox = commentLi.locator("> .cb-reply-box");
    await replyBox.getByPlaceholder("Viết trả lời…").fill(replyText);
    await replyBox.getByRole("button", { name: "Gửi" }).click();
    await expect(commentLi.locator(".cb-comment-replies")).toContainText(replyText);

    // Full reload so NotificationBell's unread-count effect runs immediately.
    await aPage.reload();
    const bell = aPage.getByRole("button", { name: "Thông báo" });
    await expect(bell.getByText("1", { exact: true })).toBeVisible();

    await bell.click();
    const menu = aPage.getByRole("menu");
    const row = menu.locator(".cb-notif-row").filter({ hasText: replyText });
    await expect(row).toBeVisible();
    await row.click();

    // Navigates to the chapter the reply happened on, and the bell menu closes.
    await aPage.waitForURL(chapterUrl);
    await expect(menu).toBeHidden();
  } finally {
    await aContext.close();
    await bContext.close();
  }
});

// Feature 2: a story's genre chips link to /browse pre-filtered to that genre.
test("clicking a genre chip on the story page opens /browse filtered to that genre", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-genrechip@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh GenreChip ${ts}`,
    title: `E2E UI Chip thể loại ${ts}`,
    content: "Truyện để thử chip thể loại dẫn tới trang khám phá. ".repeat(10),
  });

  await page.goto(`/story/${storySlug}`);
  const chip = page.locator(".cb-chips").first().locator("a.cb-chip").first();
  await expect(chip).toBeVisible();
  const href = await chip.getAttribute("href");
  expect(href).toMatch(/^\/browse\?genre=/);
  const genreSlug = href!.replace("/browse?genre=", "");

  await chip.click();
  await page.waitForURL(new RegExp(`/browse\\?genre=${genreSlug}$`));

  const genreSelect = page.locator(".cb-inline-form select").nth(0);
  await expect(genreSelect).toHaveValue(genreSlug);
});

// Feature 3: renaming a volume through the new inline edit control persists
// across a reload.
test("renaming a volume on the manage page persists after reload", async ({ page }) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const password = "Passw0rd!";
  const oldTitle = `Phần cũ ${ts}`;
  const newTitle = `Phần mới đã đổi tên ${ts}`;

  await registerReader(page, {
    email: `e2e-ui+${ts}-volrename@storyverse.local`,
    password,
    displayName: `E2E UI VolRename ${ts}`,
  });
  await becomeAuthor(page, { penName: `E2E UI Bút danh VolRename ${ts}`, password });

  const { storySlug } = await quickPublishAsAuthor(page, {
    title: `E2E UI Đổi tên phần ${ts}`,
    content: "Truyện để thử đổi tên phần. ".repeat(10),
  });

  await page.goto(`/tac-gia/truyen/${storySlug}`);
  const volumeList = page.locator("ul.cb-trend").first();
  await page.getByPlaceholder("Tên phần mới").fill(oldTitle);
  await page.getByRole("button", { name: "＋ Thêm phần" }).click();
  await expect(volumeList.getByText(oldTitle)).toBeVisible();

  await volumeList.getByRole("button", { name: "Sửa tên phần" }).click();
  const editInput = volumeList.locator("li").filter({ has: page.getByRole("button", { name: "Lưu" }) }).locator("input");
  await editInput.fill(newTitle);
  await volumeList.getByRole("button", { name: "Lưu" }).click();
  await expect(volumeList.getByText(newTitle)).toBeVisible();
  await expect(volumeList.getByText(oldTitle)).toHaveCount(0);

  await page.reload();
  await expect(volumeList.getByText(newTitle)).toBeVisible();
  await expect(volumeList.getByText(oldTitle)).toHaveCount(0);
});

// Feature 4: tags typed into the new TagInput on the submit form are sent to
// quick-publish and rendered on the story's page.
test("tags typed on the submit form are wired through and rendered on the story page", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const password = "Passw0rd!";
  const tag1 = `tag-mot-${ts}`;
  const tag2 = `tag-hai-${ts}`;

  await registerReader(page, {
    email: `e2e-ui+${ts}-tags@storyverse.local`,
    password,
    displayName: `E2E UI Tags ${ts}`,
  });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Tags ${ts}`, password });

  await page.goto("/tac-gia/dang-truyen");
  await expect(page.locator("#s-pen")).not.toHaveValue("");
  await page.locator("#s-title").fill(`E2E UI Truyện có thẻ ${ts}`);
  await page.locator("#s-content").fill("Truyện dùng để kiểm tra gắn thẻ. ".repeat(10));

  const tagInput = page.locator("#s-tags input");
  await tagInput.fill(tag1);
  await tagInput.press("Enter");
  await tagInput.fill(tag2);
  await tagInput.press("Enter");
  await expect(page.locator("#s-tags .cb-chip", { hasText: tag1 })).toBeVisible();
  await expect(page.locator("#s-tags .cb-chip", { hasText: tag2 })).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/content/v1/stories/quick-publish")),
    page.locator(".cb-form-card form button[type='submit']").click(),
  ]);
  const body = await response.json();
  const data = body.data ?? body;
  const storySlug: string = data.story.slug;
  const chapterId: string = data.firstChapter.id;

  await approveChapterAsAdmin(browser, chapterId);

  await page.goto(`/story/${storySlug}`);
  await expect(page.getByText(tag1, { exact: true })).toBeVisible();
  await expect(page.getByText(tag2, { exact: true })).toBeVisible();
});
