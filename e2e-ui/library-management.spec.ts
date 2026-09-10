import { test, expect } from "@playwright/test";
import { publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// Add-to-library -> change shelf -> shelf-tab filtering on /library -> remove,
// as a single reader account. Self-contained: publishes + approves its own
// story so it has something real to shelve.
test("reader adds a story to their library, changes its shelf, and removes it", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Tủ truyện ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-library-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Library ${ts}`,
    title,
    content: "Truyện này sẽ được thêm vào tủ truyện. ".repeat(10),
  });

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-library-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Library Reader ${ts}`,
    });

    // ---- add to library (default shelf: Reading / "Đang đọc") -------------
    await readerPage.goto(`/story/${storySlug}`);
    await readerPage.getByRole("button", { name: "＋ Thêm vào tủ" }).click();
    const shelfSelect = readerPage.locator("select.cb-input");
    await expect(shelfSelect).toHaveValue("Reading");
    await expect(readerPage.getByRole("button", { name: "Xoá" })).toBeVisible();

    // ---- change shelf via the <select> on the story page -------------------
    await shelfSelect.selectOption("Completed");
    await expect(readerPage.getByText("Đã cập nhật tủ")).toBeVisible();
    await expect(shelfSelect).toHaveValue("Completed");

    // ---- /library: shelf tabs filter correctly -----------------------------
    await readerPage.goto("/library");
    await readerPage.getByRole("button", { name: "Đã đọc xong", exact: true }).click();
    await expect(readerPage.getByText(title, { exact: false })).toBeVisible();

    await readerPage.getByRole("button", { name: "Đang đọc", exact: true }).click();
    await expect(readerPage.getByText(title, { exact: false })).toHaveCount(0);

    await readerPage.getByRole("button", { name: "Tất cả", exact: true }).click();
    const libraryRow = readerPage.locator("ul.cb-trend li", { hasText: title });
    await expect(libraryRow).toBeVisible();

    // ---- remove via the library page row's "Xoá" button --------------------
    await libraryRow.getByRole("button", { name: "Xoá" }).click();
    await expect(readerPage.getByText(title, { exact: false })).toHaveCount(0);

    // ---- gone from the story page too: back to the "add" state ------------
    await readerPage.goto(`/story/${storySlug}`);
    await expect(readerPage.getByRole("button", { name: "＋ Thêm vào tủ" })).toBeVisible();
    await expect(readerPage.getByRole("button", { name: "Xoá" })).toHaveCount(0);
  } finally {
    await readerContext.close();
  }
});
