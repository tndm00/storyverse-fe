import { test, expect } from "@playwright/test";
import { approveChapterAsAdmin, publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// Chapter-to-chapter navigation ("Chương sau →" / "← Chương trước") and the
// reading-progress it saves (libraryService.saveReadingProgress), checked
// through /library's "Đang đọc dở" section. Self-contained: publishes +
// approves a story with two published chapters.
test("reader navigates between chapters, and reading progress follows along", async ({
  browser,
  page,
}) => {
  // Two publish/approve round-trips (chapter 1 via publishAndApprove, chapter
  // 2 added + approved separately) comfortably exceeds the 30s default.
  test.setTimeout(90_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Điều hướng ${ts}`;
  const chapter2Title = `Chương hai ${ts}`;

  const { storySlug, storyId } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-nav-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Nav ${ts}`,
    title,
    content: "Chương một của truyện điều hướng. ".repeat(10),
  });

  // Add a second chapter, submitted for review immediately, then approve it.
  await page.goto(`/tac-gia/truyen/${storySlug}`);
  await page.locator("#nc-title").fill(chapter2Title);
  await page.locator("#nc-content").fill("Chương hai của truyện điều hướng. ".repeat(10));
  const [addResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/v1/stories/${storyId}/chapters`) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "＋ Thêm chương" }).click(),
  ]);
  const addBody = await addResponse.json();
  const chapter2Id: string = (addBody.data ?? addBody).id;
  await approveChapterAsAdmin(browser, chapter2Id);

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-nav-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Nav Reader ${ts}`,
    });

    await readerPage.goto(`/story/${storySlug}`);
    await readerPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    await expect(readerPage.getByRole("heading", { name: /^Chương 1\./ })).toBeVisible();

    // ---- forward: "Chương sau →" -> chapter 2, saving progress -------------
    await readerPage.getByRole("link", { name: "Chương sau →" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/${chapter2Id}$`));
    await expect(readerPage.getByRole("heading", { name: /^Chương 2\./ })).toBeVisible();

    // /library "Đang đọc dở" points at chapter 2.
    await readerPage.goto("/library");
    const continueLink = readerPage.locator(
      `a[href="/story/${storySlug}/chapter/${chapter2Id}"]`,
    );
    await expect(continueLink).toBeVisible();
    await expect(continueLink).toContainText(title);

    // ---- backward: "← Chương trước" -> back to chapter 1 -------------------
    await readerPage.goto(`/story/${storySlug}/chapter/${chapter2Id}`);
    await readerPage.getByRole("link", { name: "← Chương trước" }).click();
    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/(?!${chapter2Id}$)`));
    await expect(readerPage.getByRole("heading", { name: /^Chương 1\./ })).toBeVisible();
  } finally {
    await readerContext.close();
  }
});

// StoryDetailPage's own chapter list/table-of-contents ("Danh sách chương"):
// clicking a specific row navigates to that exact chapter, not just the
// "Đọc từ đầu" shortcut (which always goes to chapter 1) or the prev/next nav.
test("clicking a specific chapter row on the story page navigates to that exact chapter", async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Danh Sách Chương ${ts}`;
  const chapter2Title = `Chương hai để bấm ${ts}`;

  const { storySlug, storyId } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-tocrow-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh TocRow ${ts}`,
    title,
    content: "Chương một của truyện để kiểm tra bấm vào mục lục. ".repeat(10),
  });

  await page.goto(`/tac-gia/truyen/${storySlug}`);
  await page.locator("#nc-title").fill(chapter2Title);
  await page.locator("#nc-content").fill("Chương hai để kiểm tra bấm vào mục lục. ".repeat(10));
  const [addResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/v1/stories/${storyId}/chapters`) && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "＋ Thêm chương" }).click(),
  ]);
  const addBody = await addResponse.json();
  const chapter2Id: string = (addBody.data ?? addBody).id;
  await approveChapterAsAdmin(browser, chapter2Id);

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-tocrow-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI TocRow Reader ${ts}`,
    });

    await readerPage.goto(`/story/${storySlug}`);
    const chapter2Row = readerPage.locator("ul.cb-trend li", { hasText: chapter2Title });
    await chapter2Row.locator("a.cb-trend-left").click();

    await readerPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/${chapter2Id}$`));
    await expect(readerPage.getByRole("heading", { name: /^Chương 2\./ })).toBeVisible();
  } finally {
    await readerContext.close();
  }
});
