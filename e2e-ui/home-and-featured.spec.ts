import { test, expect } from "@playwright/test";
import { publishAndApprove, uniqueSuffix } from "./helpers";

// HomePage (/): the "edition" carousel's dot/arrow navigation wraps around at
// both ends. Only meaningful when the live dev DB has more than one edition
// (3 stories per edition) — guarded the same way browse-and-discovery.spec.ts
// guards its genre-options assertion.
test("HomePage renders the carousel and dot/arrow navigation wraps around", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Đang tải truyện…")).toHaveCount(0);
  await expect(page.locator(".cb-hero-grid")).toBeVisible();

  // Only the numbered dot buttons contain an inner .cb-dot span — the
  // prev/next arrow buttons (whose aria-label also starts with "Tuyển tập ")
  // don't, so this excludes them precisely.
  const dots = page.locator(".cb-dots button").filter({ has: page.locator(".cb-dot") });
  const count = await dots.count();
  if (count > 1) {
    const isActive = (i: number) => dots.nth(i).evaluate((el) => el.classList.contains("is-active"));
    expect(await isActive(0)).toBe(true);

    // "Tuyển tập sau" (next) clicked `count` times wraps all the way back to
    // the first dot.
    const next = page.getByRole("button", { name: "Tuyển tập sau" });
    for (let i = 0; i < count; i++) await next.click();
    expect(await isActive(0)).toBe(true);

    // "Tuyển tập trước" (previous) from the first dot wraps to the last one.
    const prev = page.getByRole("button", { name: "Tuyển tập trước" });
    await prev.click();
    expect(await isActive(count - 1)).toBe(true);
  }
});

// HomePage's "Xem tất cả" (trending section) and "Gửi câu chuyện" (CTA band)
// links navigate to /featured and /submit respectively.
test("HomePage 'Xem tất cả' and CTA links navigate to /featured and /submit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Xem tất cả" }).click();
  await page.waitForURL(/\/featured$/);

  await page.goto("/");
  // Also present in the site nav ("Điều hướng chính") — scope to the CTA
  // band in the page body to disambiguate.
  await page.getByRole("main").getByRole("link", { name: "Gửi câu chuyện" }).click();
  await page.waitForURL(/\/submit$/);
});

// FeaturedPage (/featured): the highest-rated story renders as the spotlight,
// with a working "Đọc ngay" link. Self-contained — publishes + approves its
// own story rather than relying on ambient DB ratings.
test("FeaturedPage renders a spotlight pick and 'Đọc ngay' links to the story", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const title = `E2E UI Nổi bật ${ts}`;

  await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-featured@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Nổi bật ${ts}`,
    title,
    content: "Truyện này dùng để kiểm tra trang Nổi bật. ".repeat(10),
  });

  await page.goto("/featured");
  // exact:true — our own test title happens to contain "Nổi bật" too, which
  // would otherwise also match a card's <h2>.
  await expect(page.getByRole("heading", { name: "Nổi bật", exact: true })).toBeVisible();
  await expect(page.getByText("Đang tải truyện…")).toHaveCount(0);
  await expect(page.getByText("Chưa có truyện nào được đánh giá.")).toHaveCount(0);

  const spotlight = page.locator(".cb-spotlight");
  await expect(spotlight).toBeVisible();
  await spotlight.getByRole("link", { name: "Đọc ngay" }).click();
  await page.waitForURL(/\/story\//);
});
