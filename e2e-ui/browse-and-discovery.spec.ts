import { test, expect } from "@playwright/test";
import { becomeAuthor, publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// /browse: genre/status/sort controls actually drive the listing request
// (asserted via the request's query params, since a shared dev DB can't
// guarantee which stories a given genre/status combination will contain) —
// plus our own freshly-published (now Ongoing) story shows up when sorting
// "Mới nhất" with no status filter, and disappears once filtered to Completed.
test("/browse genre, status, and sort controls filter the story list", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Khám phá ${ts}`;

  await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-browse@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Browse ${ts}`,
    title,
    content: "Truyện này dùng để kiểm tra bộ lọc trang khám phá. ".repeat(10),
  });

  await page.goto("/browse");
  const genreSelect = page.locator(".cb-inline-form select").nth(0);
  const statusSelect = page.locator(".cb-inline-form select").nth(1);
  const sortSelect = page.locator(".cb-inline-form select").nth(2);

  // Newest first, no status filter: our just-published story is on page 1.
  await expect(page.getByText(title, { exact: false })).toBeVisible();

  // Status filter: "Hoàn thành" (Completed) excludes our Ongoing story.
  const [completedResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/v1/stories") && r.url().includes("status=Completed"),
    ),
    statusSelect.selectOption("Completed"),
  ]);
  expect(completedResponse.ok()).toBe(true);
  await expect(page.getByText(title, { exact: false })).toHaveCount(0);

  // Back to "all statuses": the story reappears.
  await statusSelect.selectOption("");
  await expect(page.getByText(title, { exact: false })).toBeVisible();

  // Genre filter actually reaches the API with the chosen genre's slug.
  const options = await genreSelect.locator("option").allTextContents();
  if (options.length > 1) {
    const [genreResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/v1/stories") && r.url().includes("genre-slug=")),
      genreSelect.selectOption({ index: 1 }),
    ]);
    expect(genreResponse.ok()).toBe(true);
    await genreSelect.selectOption({ index: 0 });
  }

  // Sort control: switching sort re-queries without error.
  const [sortResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/v1/stories") && r.url().includes("sort-by=viewCount"),
    ),
    sortSelect.selectOption("viewCount"),
  ]);
  expect(sortResponse.ok()).toBe(true);
});

// /topics: clicking a genre tile filters the shown stories to that genre.
test("/topics filters stories by the selected genre tile", async ({ page }) => {
  await page.goto("/topics");
  await expect(page.locator(".cb-topic-tile").first()).toBeVisible();

  const tiles = page.locator(".cb-topic-tile");
  const count = await tiles.count();
  expect(count).toBeGreaterThan(0);

  const secondTile = count > 1 ? tiles.nth(1) : tiles.nth(0);
  const genreName = (await secondTile.locator(".cb-topic-name").textContent())?.trim();
  await secondTile.click();
  await expect(secondTile).toHaveClass(/is-active/);
  if (genreName) {
    await expect(page.getByRole("heading", { name: `Truyện thể loại: ${genreName}` })).toBeVisible();
  }
});

// Public author profile page renders a real author's pen name and stories.
test("public author profile page renders the author's pen name and published stories", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Hồ sơ tác giả ${ts}`;
  const penName = `E2E UI Bút danh Profile ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-profile@storyverse.local`,
    password: "Passw0rd!",
    penName,
    title,
    content: "Truyện dùng để kiểm tra trang hồ sơ tác giả công khai. ".repeat(10),
  });

  await page.goto(`/story/${storySlug}`);
  await page.getByRole("link", { name: "Trang tác giả" }).click();
  await expect(page.getByRole("heading", { name: penName })).toBeVisible();
  await expect(page.getByText(title, { exact: false })).toBeVisible();
});

// AuthorStudioPage (/tac-gia): a logged-in author sees their story list.
test("/tac-gia renders the logged-in author's own story list", async ({ browser, page }) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Studio ${ts}`;

  await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-studio@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Studio ${ts}`,
    title,
    content: "Truyện dùng để kiểm tra trang Truyện của tôi. ".repeat(10),
  });

  await page.goto("/tac-gia");
  await expect(page.getByRole("heading", { name: "Truyện của tôi" })).toBeVisible();
  await expect(page.getByText(title, { exact: false })).toBeVisible();
});

// /browse pagination: Prev/Next disable at the first/last page bounds. Only
// meaningful if the live dev DB actually has more than one page of results —
// same conditional-skip style as this file's genre-options assertion.
test("/browse pagination Prev/Next are disabled at the first/last page bounds", async ({
  page,
}) => {
  await page.goto("/browse");
  await expect(page.getByText("Đang tải…")).toHaveCount(0);

  const pager = page.locator(".cb-dots");
  if ((await pager.count()) === 0) return; // single page of results — nothing to paginate

  const prevBtn = page.getByRole("button", { name: "← Trước" });
  const nextBtn = page.getByRole("button", { name: "Sau →" });
  await expect(prevBtn).toBeDisabled();

  const pageText = await pager.locator(".cb-detail-meta").textContent();
  const totalPages = Number(pageText?.match(/\/\s*(\d+)/)?.[1] ?? 1);
  for (let i = 1; i < totalPages; i++) await nextBtn.click();

  await expect(nextBtn).toBeDisabled();
  await expect(prevBtn).toBeEnabled();
});

// BecomeAuthorPage (/tac-gia/dang-ky) redirects an already-author user
// straight to /tac-gia (the `check === "has"` branch's <Navigate>).
test("/tac-gia/dang-ky redirects an existing author to /tac-gia", async ({ page }) => {
  const ts = uniqueSuffix();
  const password = "Passw0rd!";

  await registerReader(page, {
    email: `e2e-ui+${ts}-redirect@storyverse.local`,
    password,
    displayName: `E2E UI Redirect ${ts}`,
  });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Redirect ${ts}`, password });

  await page.goto("/tac-gia/dang-ky");
  await page.waitForURL(/\/tac-gia$/);
  await expect(page.getByRole("heading", { name: "Truyện của tôi" })).toBeVisible();
});
