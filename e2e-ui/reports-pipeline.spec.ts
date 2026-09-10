import { test, expect } from "@playwright/test";
import { loginAsAdmin, publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// End-to-end: a reader files a report on a published story, an admin picks
// it up and resolves it. Also checks the resolve form's validation rules
// (must choose an action; a non-Dismiss action needs a note). Self-contained:
// publishes + approves its own story and files its own report.
test("reader files a story report and admin picks it up and resolves it", async ({
  browser,
  page,
}) => {
  // Two admin context round-trips (approve chapter, then pick-up/resolve) on
  // top of register+author+publish+report — comfortably over the 30s default.
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Báo cáo ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-reports@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Reports ${ts}`,
    title,
    content: "Truyện này sẽ bị báo cáo ngay sau khi được duyệt. ".repeat(10),
  });

  // Still logged in as the story's own author/reader account — good enough
  // to exercise fileReport({targetType:"Story"}), which just needs any
  // authed user.
  await page.goto(`/story/${storySlug}`);
  await page.getByRole("button", { name: "Báo cáo truyện" }).click();
  await page.locator("#rp-reason").selectOption("Spam");
  await page.locator("#rp-desc").fill(`Nội dung spam/quảng cáo (${ts}).`);

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/moderation/v1/reports") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Gửi báo cáo" }).click(),
  ]);
  const body = await response.json();
  const reportId: string = (body.data ?? body).id;
  await expect(page.getByText("Đã gửi báo cáo. Cảm ơn bạn.")).toBeVisible();

  // ---- admin side, separate context ----------------------------------
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await adminPage.goto(`/console-7f2k/reports/${reportId}`);
    await expect(adminPage.getByText(`Report ${reportId}`)).toBeVisible();
    await expect(adminPage.getByText("Story ·", { exact: false })).toBeVisible();

    // Validation: the resolve button is disabled until an action is chosen.
    const resolveBtn = adminPage.getByRole("button", { name: "Apply & resolve" });
    await expect(resolveBtn).toBeDisabled();

    await adminPage.getByRole("button", { name: "Pick up (start reviewing)" }).click();
    await expect(adminPage.getByText("Reviewing", { exact: true }).first()).toBeVisible();

    // Choose a non-Dismiss action and try to resolve without a note first.
    // (Clicking the placeholder <span> directly is flaky — antd overlays a
    // search input on top of it that intercepts the click — so target the
    // combobox role instead.)
    await adminPage.getByRole("combobox").click();
    await adminPage.locator(".ant-select-item-option", { hasText: "Warn" }).click();
    await expect(resolveBtn).toBeEnabled();
    await resolveBtn.click();
    await expect(
      adminPage.getByText("A resolution note is required for this action."),
    ).toBeVisible();
    // Still open (not resolved) — the failed action didn't go through.
    await expect(adminPage.getByText("This report is resolved.")).toHaveCount(0);

    // Now fill the note and resolve for real.
    await adminPage
      .getByPlaceholder("Explain the decision — kept in the audit history.")
      .fill(`Cảnh cáo tác giả vì spam (${ts}).`);
    await resolveBtn.click();
    await expect(adminPage.getByText("This report is resolved.")).toBeVisible();
  } finally {
    await adminContext.close();
  }
});

// ReportsQueuePage's reason filter really reaches the backend (unlike its
// free-text search box, which reportService.ts documents as a no-op) — and
// revisiting an already-resolved report shows the read-only "Result" panel
// instead of the pick-up/resolve action form.
test("admin reports queue reason filter narrows results, and a resolved report shows the read-only view", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Báo cáo Lọc ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-reportfilter@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Lọc ${ts}`,
    title,
    content: "Truyện này sẽ bị báo cáo để kiểm tra bộ lọc lý do. ".repeat(10),
  });

  await page.goto(`/story/${storySlug}`);
  await page.getByRole("button", { name: "Báo cáo truyện" }).click();
  await page.locator("#rp-reason").selectOption("Copyright");
  await page.locator("#rp-desc").fill(`Vi phạm bản quyền (${ts}).`);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/moderation/v1/reports") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Gửi báo cáo" }).click(),
  ]);
  const body = await response.json();
  const reportId: string = (body.data ?? body).id;
  const rowText = `${reportId}`;

  const adminContext = await browser.newContext();
  try {
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await adminPage.goto("/console-7f2k/reports");
    await adminPage.waitForLoadState("networkidle");

    const row = adminPage.locator(".ant-table-tbody tr", { hasText: rowText });
    await expect(row).toBeVisible();

    // A different reason hides it (real backend-forwarded filter).
    const reasonFilter = adminPage.locator(".ant-card-head .ant-select-selector").nth(1);
    await reasonFilter.click();
    await adminPage.locator(".ant-select-item-option", { hasText: "Spam" }).click();
    await adminPage.waitForLoadState("networkidle");
    await expect(row).toHaveCount(0);

    // Back to "All reasons": it reappears.
    await reasonFilter.click();
    await adminPage.locator(".ant-select-item-option", { hasText: "All reasons" }).click();
    await adminPage.waitForLoadState("networkidle");
    await expect(row).toBeVisible();

    // Resolve it, then revisit its detail page directly.
    await adminPage.goto(`/console-7f2k/reports/${reportId}`);
    await adminPage.getByRole("button", { name: "Pick up (start reviewing)" }).click();
    await adminPage.getByRole("combobox").click();
    await adminPage.locator(".ant-select-item-option", { hasText: "Dismiss" }).click();
    await adminPage.getByRole("button", { name: "Dismiss report" }).click();
    await expect(adminPage.getByText("This report is dismissed.")).toBeVisible();

    await adminPage.reload();
    await expect(adminPage.getByText("This report is dismissed.")).toBeVisible();
    await expect(
      adminPage.getByRole("button", { name: "Pick up (start reviewing)" }),
    ).toHaveCount(0);
    await expect(adminPage.getByRole("button", { name: "Dismiss report" })).toHaveCount(0);
  } finally {
    await adminContext.close();
  }
});

// Mirrors the story-report test above, but filed from a chapter reader page
// (ChapterReaderPage's "Báo cáo chương" button, targetType="Chapter") instead
// of the story page's "Báo cáo truyện".
test("reader files a report from a chapter page and the admin side shows targetType Chapter", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Báo Cáo Chương ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-reportchapter@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh BCChuong ${ts}`,
    title,
    content: "Chương này sẽ bị báo cáo ngay sau khi được duyệt. ".repeat(10),
  });

  await page.goto(`/story/${storySlug}`);
  await page.getByRole("link", { name: "Đọc từ đầu" }).click();
  await page.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));

  await page.getByRole("button", { name: "Báo cáo chương" }).click();
  await page.locator("#rp-reason").selectOption("Inappropriate");
  await page.locator("#rp-desc").fill(`Nội dung không phù hợp trong chương (${ts}).`);

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/moderation/v1/reports") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Gửi báo cáo" }).click(),
  ]);
  const body = await response.json();
  const reportId: string = (body.data ?? body).id;
  await expect(page.getByText("Đã gửi báo cáo. Cảm ơn bạn.")).toBeVisible();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  try {
    await loginAsAdmin(adminPage);
    await adminPage.goto(`/console-7f2k/reports/${reportId}`);
    await expect(adminPage.getByText(`Report ${reportId}`)).toBeVisible();
    // ReportDetailPage's subtitle is `${report.targetType} · reported by ...`.
    await expect(adminPage.getByText("Chapter ·", { exact: false })).toBeVisible();
    await expect(adminPage.getByText("Target")).toBeVisible();
    await expect(
      adminPage.getByText("(Chapter)", { exact: false }),
    ).toBeVisible();
  } finally {
    await adminContext.close();
  }
});

// A "Báo cáo" trigger on other readers' comments (ChapterComments.tsx) now
// exists — files a Comment-target report, and proves the admin's "Hide"
// resolution is audit-only for comments specifically (the comment stays
// visible to another reader even after the report is resolved).
test("reader reports a comment; admin resolves with Hide, but the comment stays visible", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const title = `E2E UI Báo Cáo Bình Luận ${ts}`;
  const commentText = `Bình luận sẽ bị báo cáo (${ts}).`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-reportcomment-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh BCBinhLuan ${ts}`,
    title,
    content: "Chương dùng để kiểm tra báo cáo bình luận. ".repeat(10),
  });

  // A second reader posts the comment that will be reported.
  const commenterContext = await browser.newContext();
  let chapterUrl = "";
  try {
    const commenterPage = await commenterContext.newPage();
    await registerReader(commenterPage, {
      email: `e2e-ui+${ts}-reportcomment-commenter@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI BCBinhLuan Commenter ${ts}`,
    });
    await commenterPage.goto(`/story/${storySlug}`);
    await commenterPage.getByRole("link", { name: "Đọc từ đầu" }).click();
    await commenterPage.waitForURL(new RegExp(`/story/${storySlug}/chapter/`));
    chapterUrl = commenterPage.url();
    await commenterPage
      .getByPlaceholder("Chia sẻ cảm nghĩ của bạn về chương này…")
      .fill(commentText);
    await commenterPage.getByRole("button", { name: "Đăng bình luận" }).click();
    await expect(commenterPage.getByText(commentText)).toBeVisible();
  } finally {
    await commenterContext.close();
  }

  // The story's own author reports the comment (not the comment's own author).
  await page.goto(chapterUrl);
  await expect(page.getByText(commentText)).toBeVisible();
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await page.locator("#rp-reason").selectOption("Inappropriate");
  await page.locator("#rp-desc").fill(`Bình luận không phù hợp (${ts}).`);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/moderation/v1/reports") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Gửi báo cáo" }).click(),
  ]);
  const body = await response.json();
  const reportId: string = (body.data ?? body).id;
  await expect(page.getByText("Đã gửi báo cáo. Cảm ơn bạn.")).toBeVisible();

  const adminContext = await browser.newContext();
  try {
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await adminPage.goto(`/console-7f2k/reports/${reportId}`);
    await expect(adminPage.getByText("Comment ·", { exact: false })).toBeVisible();

    await adminPage.getByRole("button", { name: "Pick up (start reviewing)" }).click();
    await adminPage.getByRole("combobox").click();
    await adminPage.locator(".ant-select-item-option", { hasText: "Hide" }).click();
    await adminPage
      .getByPlaceholder("Explain the decision — kept in the audit history.")
      .fill(`Ẩn theo báo cáo (${ts}).`);
    await adminPage.getByRole("button", { name: "Apply & resolve" }).click();
    await expect(adminPage.getByText("This report is resolved.")).toBeVisible();
  } finally {
    await adminContext.close();
  }

  // Moderation actions are audit-only (documented in reportService.ts) — the
  // comment itself was never actually hidden, confirmed from a fresh visitor.
  const readerContext = await browser.newContext();
  try {
    const readerPage = await readerContext.newPage();
    await readerPage.goto(chapterUrl);
    await expect(readerPage.getByText(commentText)).toBeVisible();
  } finally {
    await readerContext.close();
  }
});
