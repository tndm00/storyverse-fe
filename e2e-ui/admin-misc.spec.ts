import { test, expect, type Page } from "@playwright/test";
import {
  loginAsAdmin,
  openReviewItem,
  publishAndApprove,
  quickPublishAsAuthor,
  registerReader,
  becomeAuthor,
  startReviewAndApprove,
  startReviewAndReject,
  uniqueSuffix,
} from "./helpers";

// DashboardPage: stat cards render real numbers (not stuck loading/erroring),
// and a "View all" link navigates.
test("admin dashboard renders stat cards and 'View all' navigates to the review queue", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.waitForLoadState("networkidle");

  // Card's `loading` prop is false once all three counts have resolved, at
  // which point Statistic renders its numeric value node.
  const statValues = page.locator(".ant-statistic-content-value");
  await expect(statValues).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(statValues.nth(i)).toBeVisible();
    await expect(statValues.nth(i)).not.toHaveText("");
  }
  await expect(page.locator(".ant-card-loading")).toHaveCount(0);

  // Two "Recent submissions" / "Latest reports" cards both have a "View all"
  // link — the submissions one comes first in the DOM.
  await page.getByRole("link", { name: "View all" }).first().click();
  await page.waitForURL(/\/console-7f2k\/review$/);
});

// StoriesPage: status filter, column sort, row-click Drawer + Close.
test("admin stories page filters by status, sorts by views, and opens/closes the detail drawer", async ({
  page,
  browser,
}) => {
  test.setTimeout(60_000);

  // Guarantee at least one Published story exists (a freshly reset dev DB
  // has none, and the row-click/drawer assertions below need a row to click).
  const ts = uniqueSuffix();
  const authorContext = await browser.newContext();
  try {
    await publishAndApprove(await authorContext.newPage(), browser, {
      title: `E2E UI Danh sách ${ts}`,
      content: "Đảm bảo có ít nhất một truyện cho trang quản lý. ".repeat(10),
      penName: `E2E UI Bút danh Danh sách ${ts}`,
      email: `e2e-ui+${ts}-adminmisc-list@storyverse.local`,
      password: "Passw0rd!",
    });
  } finally {
    await authorContext.close();
  }

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/stories");
  await page.waitForLoadState("networkidle");

  // ---- status filter -------------------------------------------------------
  // Scoped to the card header: the table's own page-size <Select> is also a
  // "combobox" once results render, so an unscoped getByRole("combobox") is
  // ambiguous. Click the selector box (not the inner search-input role,
  // which the currently-selected label's span can sit on top of and
  // intercept pointer events for).
  const statusFilter = page.locator(".ant-card-head .ant-select-selector");
  await statusFilter.click();
  await page.locator(".ant-select-item-option", { hasText: "Ongoing" }).click();
  await expect(statusFilter.locator(".ant-select-selection-item")).toHaveText("Ongoing");
  await page.waitForLoadState("networkidle");

  await statusFilter.click();
  await page.locator(".ant-select-item-option", { hasText: "All statuses" }).click();
  await page.waitForLoadState("networkidle");

  // ---- sort by Views ------------------------------------------------------
  const viewsHeader = page.locator("th", { hasText: "Views" });
  await viewsHeader.click();
  await expect(viewsHeader.locator(".ant-table-column-sorter-up.active")).toBeVisible();
  await viewsHeader.click();
  await expect(viewsHeader.locator(".ant-table-column-sorter-down.active")).toBeVisible();

  // ---- pagination, only if this dev DB actually has more than one page ---
  // AntD hides the pagination bar entirely when the table has no rows, so
  // guard for that too (the publishAndApprove call above rules it out, but
  // keep this test resilient if that ever changes).
  const totalTextLocator = page.locator(".ant-pagination-total-text");
  const totalText = (await totalTextLocator.count()) ? await totalTextLocator.textContent() : null;
  const total = Number(totalText?.match(/\d+/)?.[0] ?? 0);
  if (total > 10) {
    const [pageTwoResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/v1/stories") && r.url().includes("page-number=2"),
      ),
      page.locator(".ant-pagination-item-2").click(),
    ]);
    expect(pageTwoResponse.ok()).toBe(true);
  }

  // ---- row title click opens the Drawer, "Close" closes it ---------------
  const firstTitleButton = page.locator(".ant-table-tbody tr").first().getByRole("button").first();
  const titleText = await firstTitleButton.textContent();
  await firstTitleButton.click();
  const drawer = page.locator(".ant-drawer-content");
  await expect(drawer).toBeVisible();
  if (titleText) {
    // Drawer's `title` prop renders into `.ant-drawer-title`, a plain <div>
    // (not a heading role).
    await expect(drawer.locator(".ant-drawer-title")).toHaveText(titleText);
  }
  // Drawer's default icon close button (`.ant-drawer-close`, aria-label
  // "Close") and our own explicit extra `<Button>Close</Button>` share the
  // same accessible name — scope to the extra button by its plain class.
  await drawer.locator(".ant-btn", { hasText: "Close" }).click();
  // AntD v5 keeps the Drawer's content mounted after close (for re-open
  // animation) rather than removing it — assert hidden, not absent.
  await expect(drawer).toBeHidden();
});

// StoriesPage's own search box (unlike the review-queue one below) really
// filters — storyService.listStories's `q` param is applied client-side over
// whatever page the backend returned (see storyService.ts), so this only
// proves same-page substring filtering: publish a uniquely-titled story,
// which lands on page 1 under the default "publishedAt desc" sort.
test("admin stories page search box actually filters rows by title", async ({ browser, page }) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Tìm Truyện ${ts}`;
  const authorContext = await browser.newContext();
  try {
    await publishAndApprove(await authorContext.newPage(), browser, {
      title,
      content: "Đảm bảo có một truyện để tìm trên trang quản lý. ".repeat(10),
      penName: `E2E UI Bút danh Tìm ${ts}`,
      email: `e2e-ui+${ts}-adminmisc-storysearch@storyverse.local`,
      password: "Passw0rd!",
    });
  } finally {
    await authorContext.close();
  }

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/stories");
  await page.waitForLoadState("networkidle");

  const searchBox = page.getByPlaceholder("Search title or author");
  const row = page.locator(".ant-table-tbody tr", { hasText: title });

  await expect(row).toBeVisible();
  await searchBox.fill(`unrelated-${uniqueSuffix()}`);
  await searchBox.press("Enter");
  await expect(row).toHaveCount(0);

  await searchBox.fill(title);
  await searchBox.press("Enter");
  await expect(row).toBeVisible();
});

// ReviewQueuePage's search box (Input.Search "Search title or author"): note
// reviewService.ts documents this as a known gap — `q` is accepted by the UI
// but never actually sent to the backend (listQueue only forwards `status`;
// there's no free-text filter on GET /v1/chapters/pending-review), so typing
// a title does not change which rows render. This test exercises the control
// itself (it accepts input and doesn't error) and — since it can't rely on
// the search to actually filter — falls back to openReviewItem's own
// last-page jump to prove the known item is still reachable in the queue.
test("admin review queue search box accepts input (queue filtering is a known no-op)", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-adminmisc-search@storyverse.local`;
  const password = "Passw0rd!";
  const title = `E2E UI Tìm kiếm Duyệt ${ts}`;

  await registerReader(page, { email, password, displayName: `E2E UI Search ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Search ${ts}`, password });
  const { chapterId } = await quickPublishAsAuthor(page, {
    title,
    content: "Chương chờ duyệt để tìm kiếm trong hàng đợi. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    // Two headings show this title: AppPageHeader's page title, and
    // ChapterContent's own <Title level={4}> for the chapter (quick-publish
    // uses the same title for the story and its first chapter).
    await expect(adminPage.getByRole("heading", { name: title }).first()).toBeVisible();

    // Back on the queue, the search input takes text and Enter without error
    // (its value just isn't wired to the query — see the comment above).
    await adminPage.goto("/console-7f2k/review");
    const searchBox = adminPage.getByPlaceholder("Search title or author");
    await searchBox.fill(title);
    await searchBox.press("Enter");
    await expect(searchBox).toHaveValue(title);
  } finally {
    await adminContext.close();
  }
});

// ReviewDetailPage revisited after the chapter has already been decided:
// GetChapterForReviewQuery has no status guard (it returns the chapter
// regardless of status), and the FE's backend-status -> ReviewStatus map only
// covers PendingReview/InReview — an already-Published chapter's status falls
// through to the "Pending" default, so "Start review" renders *enabled* (a
// real FE gap, not a guarded "already approved" state). Clicking it then
// fails server-side, surfacing the backend's real status-guard error.
test("revisiting a decided chapter's review page hits the backend's own status guard", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-adminmisc-stale@storyverse.local`;
  const password = "Passw0rd!";

  await registerReader(page, { email, password, displayName: `E2E UI Stale ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Stale ${ts}`, password });
  const { chapterId } = await quickPublishAsAuthor(page, {
    title: `E2E UI Đã Duyệt ${ts}`,
    content: "Chương này sẽ được duyệt rồi truy cập lại trang duyệt cũ. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    await startReviewAndApprove(adminPage);
    await adminPage.waitForURL(/\/console-7f2k\/stories$/);

    // Revisit the now-stale review-detail URL for the same (published) chapter.
    await adminPage.goto(`/console-7f2k/review/${chapterId}`);
    await expect(adminPage.getByTestId("start-review")).toBeEnabled();
    await expect(adminPage.getByTestId("approve-publish")).toBeDisabled();
    await expect(adminPage.getByTestId("reject")).toBeDisabled();

    await adminPage.getByTestId("start-review").click();
    await expect(
      adminPage.getByText("That chapter status change is not allowed."),
    ).toBeVisible();
  } finally {
    await adminContext.close();
  }
});

// ReviewDetailPage's *pre*-decision state: a freshly-submitted (Pending) item
// has both Approve and Reject disabled — only "Start review" is enabled.
// Clicking it flips reviewStatus to Reviewing, which is what unlocks the
// decision buttons. Distinct from the "revisit a decided item" test above,
// which is about the *post*-decision (already Published) state.
test("a freshly-submitted review item has Approve/Reject disabled until 'Start review' is clicked", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-predecision@storyverse.local`;
  const password = "Passw0rd!";

  await registerReader(page, { email, password, displayName: `E2E UI PreDecision ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh PreDecision ${ts}`, password });
  const { chapterId } = await quickPublishAsAuthor(page, {
    title: `E2E UI Trước Quyết Định ${ts}`,
    content: "Chương này vẫn đang ở trạng thái chờ duyệt, chưa ai bắt đầu xét. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);

    await expect(adminPage.getByTestId("start-review")).toBeEnabled();
    await expect(adminPage.getByTestId("approve-publish")).toBeDisabled();
    await expect(adminPage.getByTestId("reject")).toBeDisabled();

    await adminPage.getByTestId("start-review").click();

    await expect(adminPage.getByTestId("start-review")).toBeDisabled();
    await expect(adminPage.getByTestId("approve-publish")).toBeEnabled();
    await expect(adminPage.getByTestId("reject")).toBeEnabled();
  } finally {
    await adminContext.close();
  }
});

// reject-and-resubmit.spec.ts already proves the rejection reason shows up on
// the author's manage page. The genuinely uncovered angle here: the reason
// isn't a one-shot toast/local-state artifact on ReviewDetailPage itself — it
// survives the admin navigating away (to the queue) and back, because it's
// refetched fresh from the backend's decision history each time.
test("a rejection reason on ReviewDetailPage survives navigating away and back", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-reasonpersist@storyverse.local`;
  const password = "Passw0rd!";
  const reason = `Cần chỉnh sửa lại phần mở đầu (${ts}).`;

  await registerReader(page, { email, password, displayName: `E2E UI ReasonPersist ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh ReasonPersist ${ts}`, password });
  const { chapterId } = await quickPublishAsAuthor(page, {
    title: `E2E UI Lý Do Còn Lại ${ts}`,
    content: "Chương này sẽ bị từ chối rồi kiểm tra lý do có còn không. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);
    await startReviewAndReject(adminPage, reason);
    await expect(adminPage.getByText("Last decision note:")).toBeVisible();
    await expect(adminPage.getByText(reason, { exact: false })).toBeVisible();

    // Navigate away to the queue, then straight back to the same item's URL.
    await adminPage.goto("/console-7f2k/review");
    await adminPage.waitForLoadState("networkidle");
    await adminPage.goto(`/console-7f2k/review/${chapterId}`);

    await expect(adminPage.getByText("Last decision note:")).toBeVisible();
    await expect(adminPage.getByText(reason, { exact: false })).toBeVisible();
  } finally {
    await adminContext.close();
  }
});

// DashboardPage's four stat cards, read as before/after deltas (this is a
// shared live dev DB, so absolute values aren't meaningful): "Pending review"
// (index 0), "Reports pending" (index 2) and "Total stories" (index 3), each
// exercised by the smallest action that should move exactly that one counter.
// Stats are read from a dedicated admin context so the reader/author flow
// driving `page` never has to fight over which account is logged in.
async function readStat(adminPage: Page, index: number): Promise<number> {
  await adminPage.goto("/console-7f2k");
  await adminPage.waitForLoadState("networkidle");
  const values = adminPage.locator(".ant-statistic-content-value");
  await expect(values).toHaveCount(4);
  const text = await values.nth(index).textContent();
  return Number(text?.replace(/[^\d.-]/g, "") ?? "0");
}

test("submitting a new chapter for review increases 'Pending review' by exactly 1", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    const before = await readStat(adminPage, 0);

    const ts = uniqueSuffix();
    await registerReader(page, {
      email: `e2e-ui+${ts}-dash-pending@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Dash Pending ${ts}`,
    });
    await becomeAuthor(page, { penName: `E2E UI Bút danh DashPending ${ts}`, password: "Passw0rd!" });
    await quickPublishAsAuthor(page, {
      title: `E2E UI Dash Chờ Duyệt ${ts}`,
      content: "Chương này sẽ tăng số liệu chờ duyệt lên đúng 1. ".repeat(10),
    });

    const after = await readStat(adminPage, 0);
    expect(after).toBe(before + 1);
  } finally {
    await adminContext.close();
  }
});

test("filing a new report increases 'Reports pending' by exactly 1", async ({ browser, page }) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-dash-reports@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh DashReports ${ts}`,
    title: `E2E UI Dash Báo Cáo ${ts}`,
    content: "Truyện này sẽ bị báo cáo để kiểm tra số liệu báo cáo. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    const before = await readStat(adminPage, 2);

    await page.goto(`/story/${storySlug}`);
    await page.getByRole("button", { name: "Báo cáo truyện" }).click();
    await page.locator("#rp-reason").selectOption("Spam");
    await page.locator("#rp-desc").fill(`Nội dung spam (${ts}).`);
    await page.getByRole("button", { name: "Gửi báo cáo" }).click();
    await expect(page.getByText("Đã gửi báo cáo. Cảm ơn bạn.")).toBeVisible();

    const after = await readStat(adminPage, 2);
    expect(after).toBe(before + 1);
  } finally {
    await adminContext.close();
  }
});

test("publishing and approving a new story increases 'Total stories' by exactly 1", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    const before = await readStat(adminPage, 3);

    const ts = uniqueSuffix();
    await publishAndApprove(page, browser, {
      email: `e2e-ui+${ts}-dash-stories@storyverse.local`,
      password: "Passw0rd!",
      penName: `E2E UI Bút danh DashStories ${ts}`,
      title: `E2E UI Dash Tổng Truyện ${ts}`,
      content: "Truyện này sẽ tăng tổng số truyện lên đúng 1. ".repeat(10),
    });

    const after = await readStat(adminPage, 3);
    expect(after).toBe(before + 1);
  } finally {
    await adminContext.close();
  }
});

// The "Latest reports" card (distinct from "Recent submissions", already
// covered above): shows a freshly-filed report, and its own "View all" link
// goes to the reports queue (not the review queue).
test("dashboard's 'Latest reports' card shows a fresh report and its own 'View all' goes to the reports queue", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-dash-latest@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh DashLatest ${ts}`,
    title: `E2E UI Dash Báo Cáo Mới Nhất ${ts}`,
    content: "Truyện này sẽ xuất hiện trong danh sách báo cáo mới nhất. ".repeat(10),
  });

  await page.goto(`/story/${storySlug}`);
  await page.getByRole("button", { name: "Báo cáo truyện" }).click();
  await page.locator("#rp-reason").selectOption("Other");
  await page.locator("#rp-desc").fill(`Báo cáo để kiểm tra thẻ báo cáo mới nhất (${ts}).`);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/moderation/v1/reports") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Gửi báo cáo" }).click(),
  ]);
  const body = await response.json();
  const reportId: string = (body.data ?? body).id;

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await adminPage.goto("/console-7f2k");
    await adminPage.waitForLoadState("networkidle");

    const latestReportsCard = adminPage.locator(".ant-card", { hasText: "Latest reports" }).first();
    await expect(
      latestReportsCard.locator(`a[href="/console-7f2k/reports/${reportId}"]`),
    ).toBeVisible();

    await latestReportsCard.getByRole("link", { name: "View all" }).click();
    await adminPage.waitForURL(/\/console-7f2k\/reports$/);
  } finally {
    await adminContext.close();
  }
});

// AppPageHeader's breadcrumb: the non-current crumb ("Review queue") on
// ReviewDetailPage is a real link back to the list page, not just decoration.
test("clicking the 'Review queue' breadcrumb crumb on a review item navigates back to the queue", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-crumb@storyverse.local`;
  const password = "Passw0rd!";

  await registerReader(page, { email, password, displayName: `E2E UI Crumb ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Crumb ${ts}`, password });
  const { chapterId } = await quickPublishAsAuthor(page, {
    title: `E2E UI Breadcrumb ${ts}`,
    content: "Chương dùng để kiểm tra breadcrumb trên trang duyệt. ".repeat(10),
  });

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await openReviewItem(adminPage, chapterId);

    await adminPage.locator(".ant-breadcrumb").getByRole("link", { name: "Review queue" }).click();
    await adminPage.waitForURL(/\/console-7f2k\/review$/);
  } finally {
    await adminContext.close();
  }
});
