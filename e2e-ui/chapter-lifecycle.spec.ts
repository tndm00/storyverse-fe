import { test, expect } from "@playwright/test";
import {
  approveChapterAsAdmin,
  becomeAuthor,
  publishAndApprove,
  quickPublishAsAuthor,
  registerReader,
  uniqueSuffix,
} from "./helpers";

// Covers the StoryManagePage / ChapterEditorPage actions not already exercised
// by author-publish-and-review / reject-and-resubmit: adding a volume, adding
// a chapter as a draft vs. submitting it immediately, submitting a draft for
// review from the manage page, editing a chapter's content, and removing a
// published chapter. Self-contained: registers its own author + story.
test("author manages volumes and the chapter lifecycle (add, draft, submit, edit, remove)", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const email = `e2e-ui+${ts}-lifecycle@storyverse.local`;
  const password = "Passw0rd!";
  const title = `E2E UI Vòng đời ${ts}`;
  const volumeTitle = `Phần Một ${ts}`;
  const draftTitle = `Chương nháp ${ts}`;
  const draftContent = "Đây là nội dung chương nháp, chưa gửi duyệt. ".repeat(8);
  const pendingTitle = `Chương gửi ngay ${ts}`;
  const pendingContent = "Chương này được gửi duyệt ngay khi tạo. ".repeat(8);
  const editedTitle = `Chương nháp (đã sửa) ${ts}`;
  const editedContent = "Nội dung đã được chỉnh sửa và lưu lại. ".repeat(8);

  await registerReader(page, { email, password, displayName: `E2E UI Lifecycle ${ts}` });
  await becomeAuthor(page, { penName: `E2E UI Bút danh LC ${ts}`, password });

  const { storySlug, chapterId: firstChapterId } = await quickPublishAsAuthor(page, {
    title,
    content: "Chương đầu tiên của truyện, sẽ được duyệt và gỡ sau. ".repeat(10),
  });

  // Get chapter 1 all the way to Published before doing anything else, while
  // it's still the most-recently-submitted item in the review queue.
  await approveChapterAsAdmin(browser, firstChapterId);

  await page.goto(`/tac-gia/truyen/${storySlug}`);
  await expect(page.getByText("Đang ra")).toBeVisible(); // story auto-flips to Ongoing

  // ---- add a volume -------------------------------------------------
  await page.getByPlaceholder("Tên phần mới").fill(volumeTitle);
  await page.getByRole("button", { name: "＋ Thêm phần" }).click();
  // Scoped to the volume-list title span: the same text also appears as an
  // <option> in the "add chapter" volume picker once the volume exists.
  await expect(page.locator("span.cb-trend-title", { hasText: volumeTitle })).toBeVisible();

  // ---- add a chapter that stays Draft (checkbox off) -----------------
  await page.locator("#nc-title").fill(draftTitle);
  await page.locator("#nc-content").fill(draftContent);
  await page.locator("#nc-pub").uncheck();
  await page.getByRole("button", { name: "＋ Thêm chương" }).click();

  const draftRow = page.locator("li", { hasText: draftTitle });
  // exact:true — getByText's default substring match is case-insensitive, so
  // "Nháp" would otherwise also match inside the chapter title itself.
  await expect(draftRow.getByText("Nháp", { exact: true })).toBeVisible();

  // ---- add a chapter that's submitted immediately (checkbox on) ------
  // The checkbox state isn't reset after a successful add, so re-check it
  // explicitly (it was just unchecked for the draft chapter above).
  await page.locator("#nc-pub").check();
  await page.locator("#nc-title").fill(pendingTitle);
  await page.locator("#nc-content").fill(pendingContent);
  await page.getByRole("button", { name: "＋ Thêm chương" }).click();

  const pendingRow = page.locator("li", { hasText: pendingTitle });
  await expect(pendingRow.getByText("Chờ duyệt", { exact: true })).toBeVisible();

  // ---- submit the draft chapter for review from its "Gửi duyệt" button --
  await draftRow.getByRole("button", { name: "Gửi duyệt", exact: true }).click();
  await expect(draftRow.getByText("Chờ duyệt", { exact: true })).toBeVisible();

  // ---- open the (now pending) draft chapter in the editor, edit + save --
  await draftRow.getByRole("link").click();
  await page.waitForURL(new RegExp(`/tac-gia/truyen/${storySlug}/chuong/`));
  await page.locator("#ec-title").fill(editedTitle);
  await page.locator("#ec-content").fill(editedContent);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã lưu chương")).toBeVisible();

  // Reload to confirm the edit actually persisted server-side.
  await page.reload();
  await expect(page.locator("#ec-title")).toHaveValue(editedTitle);
  // Backend trims trailing whitespace on save.
  await expect(page.locator("#ec-content")).toHaveValue(editedContent.trim());

  // ---- remove the published (chapter 1) via the editor's "Gỡ chương" ----
  await page.goto(`/tac-gia/truyen/${storySlug}`);
  const publishedRow = page.locator("li", { hasText: title }).first();
  await publishedRow.getByRole("link").click();
  await page.waitForURL(new RegExp(`/tac-gia/truyen/${storySlug}/chuong/${firstChapterId}$`));
  await expect(page.getByText("Đã duyệt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gỡ chương" }).click();

  await page.waitForURL(new RegExp(`/tac-gia/truyen/${storySlug}$`));
  // Removed chapters are excluded from the manage-page listing entirely
  // (ChapterRepository filters out Status == Removed), so confirm the
  // removal by revisiting the chapter's own editor page instead.
  await expect(page.locator("li", { hasText: title })).toHaveCount(0);
  await page.goto(`/tac-gia/truyen/${storySlug}/chuong/${firstChapterId}`);
  await expect(page.getByText("Đã gỡ", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gỡ chương" })).toHaveCount(0);
});

// Add-volume/add-chapter gating on StoryManagePage (buttons stay disabled
// until their required fields are non-blank), and ChapterEditorPage's 404 for
// an unknown chapter id under a real story.
test("add-volume and add-chapter buttons stay disabled until required fields are filled, and the chapter editor 404s for an unknown id", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-gating@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Gating ${ts}`,
    title: `E2E UI Ràng buộc ${ts}`,
    content: "Truyện dùng để kiểm tra ràng buộc nút bấm. ".repeat(10),
  });

  await page.goto(`/tac-gia/truyen/${storySlug}`);

  const addVolumeBtn = page.getByRole("button", { name: "＋ Thêm phần" });
  await expect(addVolumeBtn).toBeDisabled();
  await page.getByPlaceholder("Tên phần mới").fill("   ");
  await expect(addVolumeBtn).toBeDisabled(); // whitespace-only doesn't count
  await page.getByPlaceholder("Tên phần mới").fill(`Phần Ràng Buộc ${ts}`);
  await expect(addVolumeBtn).toBeEnabled();

  const addChapterBtn = page.getByRole("button", { name: "＋ Thêm chương" });
  await expect(addChapterBtn).toBeDisabled();
  await page.locator("#nc-title").fill(`Chương Ràng Buộc ${ts}`);
  await expect(addChapterBtn).toBeDisabled(); // content still empty
  await page.locator("#nc-content").fill("Nội dung chương. ".repeat(8));
  await expect(addChapterBtn).toBeEnabled();

  await page.goto(`/tac-gia/truyen/${storySlug}/chuong/not-a-real-chapter-id`);
  await expect(page.getByText("This page does not exist.")).toBeVisible();
});

// ChapterList groups chapters by volume: an "unassigned" bucket
// ("Không thuộc phần nào") first, then each volume by orderIndex — a story
// with 2 volumes plus one unassigned chapter renders all 3 groups correctly.
test("a story with 2 volumes renders its chapters correctly grouped, plus an unassigned bucket", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();
  const volume1Title = `Phần Một Nhóm ${ts}`;
  const volume2Title = `Phần Hai Nhóm ${ts}`;
  const unassignedTitle = `Chương Ngoài Phần ${ts}`;
  const vol1ChapterTitle = `Chương Của Phần Một ${ts}`;
  const vol2ChapterTitle = `Chương Của Phần Hai ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-volgroups@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh VolGroups ${ts}`,
    title: `E2E UI Nhóm Theo Phần ${ts}`,
    content: "Chương đầu tiên, không thuộc phần nào. ".repeat(10),
  });

  await page.goto(`/tac-gia/truyen/${storySlug}`);

  // ---- create 2 volumes -------------------------------------------------
  await page.getByPlaceholder("Tên phần mới").fill(volume1Title);
  await page.getByRole("button", { name: "＋ Thêm phần" }).click();
  await expect(page.locator("span.cb-trend-title", { hasText: volume1Title })).toBeVisible();

  await page.getByPlaceholder("Tên phần mới").fill(volume2Title);
  await page.getByRole("button", { name: "＋ Thêm phần" }).click();
  await expect(page.locator("span.cb-trend-title", { hasText: volume2Title })).toBeVisible();

  // ---- one more unassigned chapter (checkbox off keeps it as Draft, but
  // that doesn't matter for grouping — ChapterList groups regardless of
  // status) ---------------------------------------------------------------
  await page.locator("#nc-pub").uncheck();
  await page.locator("#nc-title").fill(unassignedTitle);
  await page.locator("#nc-content").fill("Chương này không thuộc phần nào cả. ".repeat(8));
  await page.getByRole("button", { name: "＋ Thêm chương" }).click();
  await expect(page.locator("li", { hasText: unassignedTitle })).toBeVisible();

  // ---- one chapter assigned to volume 1 ----------------------------------
  await page.locator("#nc-pub").check();
  await page.locator("#nc-title").fill(vol1ChapterTitle);
  await page.locator("#nc-content").fill("Chương này thuộc phần một. ".repeat(8));
  await page.locator("#nc-vol").selectOption({ label: volume1Title });
  await page.getByRole("button", { name: "＋ Thêm chương" }).click();
  await expect(page.locator("li", { hasText: vol1ChapterTitle })).toBeVisible();

  // ---- one chapter assigned to volume 2 ----------------------------------
  await page.locator("#nc-title").fill(vol2ChapterTitle);
  await page.locator("#nc-content").fill("Chương này thuộc phần hai. ".repeat(8));
  await page.locator("#nc-vol").selectOption({ label: volume2Title });
  await page.getByRole("button", { name: "＋ Thêm chương" }).click();
  await expect(page.locator("li", { hasText: vol2ChapterTitle })).toBeVisible();

  // ---- verify the 3 groups (unassigned first, then vol1, then vol2), and
  // that each chapter is under the right group heading -------------------
  const groups = page.locator(".cb-chapter-group");
  await expect(groups).toHaveCount(3);

  const unassignedGroup = groups.filter({
    has: page.locator(".cb-chapter-group-title", { hasText: "Không thuộc phần nào" }),
  });
  await expect(unassignedGroup.getByText(unassignedTitle)).toBeVisible();
  await expect(unassignedGroup.getByText(vol1ChapterTitle)).toHaveCount(0);
  await expect(unassignedGroup.getByText(vol2ChapterTitle)).toHaveCount(0);
  // The story's own first (quick-published) chapter is also unassigned.
  await expect(unassignedGroup.locator("li")).toHaveCount(2);

  const vol1Group = groups.filter({ has: page.locator(".cb-chapter-group-title", { hasText: volume1Title }) });
  await expect(vol1Group.getByText(vol1ChapterTitle)).toBeVisible();
  await expect(vol1Group.getByText(vol2ChapterTitle)).toHaveCount(0);
  await expect(vol1Group.locator("li")).toHaveCount(1);

  const vol2Group = groups.filter({ has: page.locator(".cb-chapter-group-title", { hasText: volume2Title }) });
  await expect(vol2Group.getByText(vol2ChapterTitle)).toBeVisible();
  await expect(vol2Group.getByText(vol1ChapterTitle)).toHaveCount(0);
  await expect(vol2Group.locator("li")).toHaveCount(1);
});
