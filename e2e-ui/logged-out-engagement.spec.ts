import { test, expect } from "@playwright/test";
import { publishAndApprove, uniqueSuffix } from "./helpers";

// AddToLibraryButton (src/site/components/story/AddToLibraryButton.tsx): a
// logged-out visitor sees a "Đăng nhập để lưu" link instead of the add button.
test("a logged-out visitor sees a login link instead of the add-to-library button", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-loggedout-lib@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh LoggedOut ${ts}`,
    title: `E2E UI Đăng xuất Tủ ${ts}`,
    content: "Truyện dùng để kiểm tra trạng thái chưa đăng nhập. ".repeat(10),
  });

  // Fresh, unauthenticated context — `page` above is signed in as the author.
  const guestContext = await browser.newContext();
  try {
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`/story/${storySlug}`);
    await expect(guestPage.getByRole("link", { name: "Đăng nhập để lưu" })).toBeVisible();
    await expect(guestPage.getByRole("button", { name: "＋ Thêm vào tủ" })).toHaveCount(0);
  } finally {
    await guestContext.close();
  }
});

// StoryEngagementBar (src/site/components/story/StoryEngagementBar.tsx): a
// logged-out visitor sees the vote button disabled and a login prompt instead
// of the star-rating box.
test("a logged-out visitor sees rating/vote controls disabled with a login prompt", async ({
  browser,
  page,
}) => {
  const ts = uniqueSuffix();
  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-loggedout-engage@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh LoggedOut2 ${ts}`,
    title: `E2E UI Đăng xuất Tương tác ${ts}`,
    content: "Truyện dùng để kiểm tra tương tác khi chưa đăng nhập. ".repeat(10),
  });

  const guestContext = await browser.newContext();
  try {
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`/story/${storySlug}`);
    const engage = guestPage.locator(".cb-engage");
    await expect(engage.getByRole("button", { name: "♥ Bình chọn" })).toBeDisabled();
    // Star-rating box only renders once authenticated — replaced by a login
    // prompt paragraph with a link to /tai-khoan.
    await expect(engage.locator(".cb-rate-box")).toHaveCount(0);
    await expect(engage.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
  } finally {
    await guestContext.close();
  }
});
