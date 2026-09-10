import { test, expect } from "@playwright/test";
import { loginAsAdmin, uniqueSuffix } from "./helpers";

// Full CRUD + visibility toggle on the admin Genres page, plus a validation
// check on the create modal. Self-contained: creates its own throwaway genre
// with a unique name/slug per run so repeated local runs never collide.
test("admin creates, edits, hides, and re-shows a genre; empty name is rejected", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const name = `E2E UI Thể loại ${ts}`;
  const updatedName = `E2E UI Thể loại (đã sửa) ${ts}`;

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/genres");

  // ---- validation: empty name is rejected, no request sent -------------
  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  const modal = page.locator(".ant-modal-content");
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Nhập tên thể loại")).toBeVisible();
  // Modal is still open (nothing was submitted).
  await expect(modal).toBeVisible();

  // ---- create ------------------------------------------------------
  await modal.getByLabel("Tên").fill(name);
  await modal.getByRole("button", { name: "Lưu" }).click();
  await expect(modal).toBeHidden();

  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText("Hiện", { exact: true })).toBeVisible();

  // ---- edit ----------------------------------------------------------
  await row.getByRole("button", { name: "Sửa" }).click();
  const editModal = page.locator(".ant-modal-content");
  await expect(editModal).toBeVisible();
  await expect(editModal.getByLabel("Tên")).toHaveValue(name);
  await editModal.getByLabel("Tên").fill(updatedName);
  await editModal.getByRole("button", { name: "Lưu" }).click();
  await expect(editModal).toBeHidden();

  const updatedRow = page.locator("tr", { hasText: updatedName });
  await expect(updatedRow).toBeVisible();

  // ---- hide ------------------------------------------------------------
  await updatedRow.getByRole("button", { name: "Ẩn", exact: true }).click();
  await expect(updatedRow.getByText("Ẩn", { exact: true })).toBeVisible();

  // ---- show again --------------------------------------------------
  await updatedRow.getByRole("button", { name: "Hiện", exact: true }).click();
  await expect(updatedRow.getByText("Hiện", { exact: true })).toBeVisible();
});

// Form.Item's own "required" rule on displayOrder (separate from the name
// field's own required check above): clearing the InputNumber blocks submit.
test("clearing displayOrder on the create form shows a required-field error and blocks submit", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const name = `E2E UI Thiếu Thứ Tự ${ts}`;

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/genres");

  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  const modal = page.locator(".ant-modal-content");
  await expect(modal).toBeVisible();

  await modal.getByLabel("Tên").fill(name);
  // displayOrder is pre-filled by openCreate (data?.length ?? 0) — clear it.
  const displayOrderInput = modal.getByLabel("Thứ tự hiển thị");
  await displayOrderInput.fill("");
  await modal.getByRole("button", { name: "Lưu" }).click();

  // No custom message on this rule — antd's own default Form validateMessages
  // (src/locale/en_US.ts, used when no ConfigProvider locale is set) render
  // required errors as "Please enter ${label}".
  await expect(modal.getByText("Please enter Thứ tự hiển thị")).toBeVisible();
  await expect(modal).toBeVisible();
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
});

// Form.Item's `{ max: 100 }` rule on the name field, with no custom message —
// antd's own default Form validateMessages template for a string "max"
// violation is "${label} must be up to ${max} characters" (antd's
// locale/en_US.ts defaultValidateMessages, used with no ConfigProvider
// locale set), so the field label ("Tên") and the configured max (100) both
// show up in the rendered error.
test("a genre name over 100 characters shows the max-length error and blocks submit", async ({
  page,
}) => {
  const longName = "A".repeat(101);

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/genres");

  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  const modal = page.locator(".ant-modal-content");
  await expect(modal).toBeVisible();

  await modal.getByLabel("Tên").fill(longName);
  await modal.getByRole("button", { name: "Lưu" }).click();

  await expect(modal.getByText("Tên must be up to 100 characters")).toBeVisible();
  await expect(modal).toBeVisible();
});

// Creating a genre with a name that already exists is rejected by the
// backend (unique constraint) — useAsyncRunner surfaces that as a generic
// antd error toast, and the modal (not `destroyOnClose` on a failed submit —
// Form.validateFields resolved fine, the async `run()` call itself just threw)
// stays open instead of closing.
test("creating a genre with a duplicate name shows an error toast and keeps the modal open", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const name = `E2E UI Trùng Tên ${ts}`;

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/genres");

  // Create it once.
  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  const modal = page.locator(".ant-modal-content");
  await modal.getByLabel("Tên").fill(name);
  await modal.getByRole("button", { name: "Lưu" }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator("tr", { hasText: name })).toBeVisible();

  // Try to create it again with the exact same name.
  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  await expect(modal).toBeVisible();
  await modal.getByLabel("Tên").fill(name);
  await modal.getByRole("button", { name: "Lưu" }).click();

  await expect(page.locator(".ant-message-error")).toBeVisible();
  await expect(modal).toBeVisible();
});

// GenresPage's own tooltip invites negative displayOrder values ("Có thể
// dùng số âm để đưa lên đầu" — negative numbers bring a genre to the front).
// CreateGenreCommandValidator/UpdateGenreCommandValidator used to reject any
// negative value with a 400 (a genuine FE/BE mismatch, previously flagged and
// left unfixed); both validators were relaxed to match the tooltip's promise.
// This test covers the now-real behavior: a negative displayOrder is
// accepted, and the row sorts to the very top of the (ascending-by-
// displayOrder) table.
test("a negative displayOrder is accepted and sorts the genre to the top of the list", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const name = `E2E UI Thứ Tự Âm ${ts}`;

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/genres");

  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  const modal = page.locator(".ant-modal-content");
  await modal.getByLabel("Tên").fill(name);
  // A fixed value like -999 would tie with (and can lose the top spot to) a
  // leftover genre from an earlier run of this same test against the shared,
  // never-cleaned dev DB. DisplayOrder is a 32-bit int server-side, so a raw
  // millisecond timestamp overflows it — but Unix *seconds* fits comfortably
  // (until year 2038) and only ever increases, so its negation is guaranteed
  // strictly smaller than any earlier run's value, making this run's genre
  // the unique new minimum every time.
  const displayOrder = -Math.floor(Date.now() / 1000);
  await modal.getByLabel("Thứ tự hiển thị").fill(String(displayOrder));
  const [createResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/content/v1/genres") && r.request().method() === "POST",
    ),
    modal.getByRole("button", { name: "Lưu" }).click(),
  ]);
  expect(createResponse.ok()).toBe(true);
  await expect(modal).toBeHidden();

  await expect(page.locator("tr", { hasText: name })).toBeVisible();
  // Table defaults to ascending-by-displayOrder — -999 should place it first.
  await expect(page.locator(".ant-table-tbody tr").first()).toContainText(name);
});

// Escape closes the create/edit Modal without submitting anything.
test("pressing Escape while the create-genre modal is open closes it without creating anything", async ({
  page,
}) => {
  const ts = uniqueSuffix();
  const name = `E2E UI Huỷ Bằng Escape ${ts}`;

  await loginAsAdmin(page);
  await page.goto("/console-7f2k/genres");

  await page.getByRole("button", { name: "Thêm thể loại" }).click();
  const modal = page.locator(".ant-modal-content");
  await expect(modal).toBeVisible();
  await modal.getByLabel("Tên").fill(name);

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
});
