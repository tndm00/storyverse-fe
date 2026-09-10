import { test, expect } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

// Negative-path check scripts/e2e.mjs doesn't do at the UI layer: a freshly
// guest-published (still-pending) story must not appear anywhere public, and
// its own page must render a not-found state, until a moderator approves it.
test("a pending guest-published story is not publicly visible anywhere", async ({ page }) => {
  const ts = uniqueSuffix();
  const title = `E2E UI Ẩn ${ts}`;

  await page.goto("/submit");
  await page.locator("#s-title").fill(title);
  await page.locator("#s-pen").fill(`Khách Ẩn ${ts}`);
  await page.locator("#s-content").fill("Truyện này vẫn đang chờ duyệt. ".repeat(10));
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/content/v1/stories/guest-publish")),
    page.locator(".cb-form-card form button[type='submit']").click(),
  ]);
  const body = await response.json();
  const slug: string = (body.data ?? body).slug;

  // Not on the home page's latest/trending lists.
  await page.goto("/");
  await expect(page.getByText(title, { exact: false })).toHaveCount(0);

  // Not in the browse listing either.
  await page.goto("/browse");
  await expect(page.getByText(title, { exact: false })).toHaveCount(0);

  // Its own page 404s while pending review.
  await page.goto(`/story/${slug}`);
  await expect(page.getByText("This page does not exist.")).toBeVisible();
});
