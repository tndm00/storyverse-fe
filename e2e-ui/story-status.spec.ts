import { test, expect } from "@playwright/test";
import { becomeAuthor, publishAndApprove, quickPublishAsAuthor, registerReader, uniqueSuffix } from "./helpers";

// Once a story has a Published chapter it auto-flips to Ongoing (backend
// ApproveChapterCommandHandler), which unlocks the manual status-transition
// dropdown on StoryManagePage (STORY_STATUS_TRANSITIONS.Ongoing includes
// Completed). Self-contained: publishes + approves its own story.
test("author transitions a story's status from Ongoing to Completed", async ({ browser, page }) => {
  const ts = uniqueSuffix();
  const title = `E2E UI Trạng thái ${ts}`;

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-status@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Status ${ts}`,
    title,
    content: "Truyện này sẽ được đổi trạng thái sau khi chương đầu được duyệt. ".repeat(10),
  });

  await page.goto(`/tac-gia/truyen/${storySlug}`);
  await expect(page.getByText("Đang ra")).toBeVisible();

  // Scoped to `.cb-inline-form select`: the only <select> in that wrapper is
  // the status-transition one (the "add volume" inline-form has no select,
  // and the "add chapter" volume-picker select lives in a different section).
  await page.locator(".cb-inline-form select").selectOption("Completed");
  await page.getByRole("button", { name: "Cập nhật" }).click();

  await expect(page.getByText("Hoàn thành")).toBeVisible();
  await expect(page.getByText("Đang ra")).toHaveCount(0);
  // Completed has no further transitions — the dropdown/button disappear.
  await expect(page.getByRole("button", { name: "Cập nhật" })).toHaveCount(0);
});

// STORY_STATUS_TRANSITIONS.Draft = [] — a story with no approved chapter yet
// has zero status-transition controls at all (not just a dropdown with no
// options), and shows the Draft-specific guidance paragraph instead.
test("a Draft story (chapter not yet approved) has no status-transition controls", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const password = "Passw0rd!";

  await registerReader(page, {
    email: `e2e-ui+${ts}-draft-status@storyverse.local`,
    password,
    displayName: `E2E UI Draft Status ${ts}`,
  });
  await becomeAuthor(page, { penName: `E2E UI Bút danh Draft ${ts}`, password });
  const { storySlug } = await quickPublishAsAuthor(page, {
    title: `E2E UI Nháp ${ts}`,
    content: "Truyện này chưa có chương nào được duyệt. ".repeat(10),
  });

  await page.goto(`/tac-gia/truyen/${storySlug}`);
  await expect(page.getByText("Nháp", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Truyện đang là nháp và chưa hiển thị công khai. Gửi duyệt chương đầu tiên — truyện sẽ hiển thị công khai ngay sau khi được kiểm duyệt.",
    ),
  ).toBeVisible();
  await expect(page.locator(".cb-inline-form select")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cập nhật" })).toHaveCount(0);
});
