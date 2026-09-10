import { test, expect } from "@playwright/test";
import { publishAndApprove, registerReader, uniqueSuffix } from "./helpers";

// Weekly vote (communityService.castVote / StoryEngagementBar's "♥ Bình chọn"
// button): a first vote is recorded and reflected in the count, an immediate
// second vote in the same week is rejected with the once-per-week message.
// Self-contained: publishes + approves its own story to vote on.
test("reader casts a weekly vote once, and a second vote the same week is rejected", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();

  const { storySlug } = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-vote-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh Vote ${ts}`,
    title: `E2E UI Bình chọn ${ts}`,
    content: "Truyện này sẽ được bình chọn trong tuần. ".repeat(10),
  });

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-vote-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI Vote Reader ${ts}`,
    });
    await readerPage.goto(`/story/${storySlug}`);

    const voteButton = readerPage.getByRole("button", { name: "♥ Bình chọn" });

    // ---- first vote: recorded ----------------------------------------------
    await voteButton.click();
    await expect(readerPage.getByText("Đã ghi nhận bình chọn")).toBeVisible();
    await expect(readerPage.getByText("1 lượt", { exact: false })).toBeVisible();

    // ---- second vote, same session/week: rejected --------------------------
    await voteButton.click();
    await expect(
      readerPage.getByText("Bạn đã bình chọn truyện này trong tuần rồi."),
    ).toBeVisible();
    // The count is unaffected by the rejected duplicate.
    await expect(readerPage.getByText("1 lượt", { exact: false })).toBeVisible();
  } finally {
    await readerContext.close();
  }
});

// Votes are scoped per story (communityService.castVote posts { storyId }) —
// voting on story A must not move story B's own weekly vote count.
test("voting on one story doesn't change another story's weekly vote count", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);

  const ts = uniqueSuffix();

  const storyA = await publishAndApprove(page, browser, {
    email: `e2e-ui+${ts}-vote-iso-a-author@storyverse.local`,
    password: "Passw0rd!",
    penName: `E2E UI Bút danh VoteIsoA ${ts}`,
    title: `E2E UI Bình Chọn A ${ts}`,
    content: "Truyện A sẽ được bình chọn. ".repeat(10),
  });

  const authorBContext = await browser.newContext();
  let storyBSlug = "";
  try {
    const storyB = await publishAndApprove(await authorBContext.newPage(), browser, {
      email: `e2e-ui+${ts}-vote-iso-b-author@storyverse.local`,
      password: "Passw0rd!",
      penName: `E2E UI Bút danh VoteIsoB ${ts}`,
      title: `E2E UI Bình Chọn B ${ts}`,
      content: "Truyện B sẽ không được bình chọn. ".repeat(10),
    });
    storyBSlug = storyB.storySlug;
  } finally {
    await authorBContext.close();
  }

  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  try {
    await registerReader(readerPage, {
      email: `e2e-ui+${ts}-vote-iso-reader@storyverse.local`,
      password: "Passw0rd!",
      displayName: `E2E UI VoteIso Reader ${ts}`,
    });

    // Story B's vote count before touching story A at all.
    await readerPage.goto(`/story/${storyBSlug}`);
    await expect(readerPage.getByText("0 lượt", { exact: false })).toBeVisible();

    // Vote on story A only.
    await readerPage.goto(`/story/${storyA.storySlug}`);
    await readerPage.getByRole("button", { name: "♥ Bình chọn" }).click();
    await expect(readerPage.getByText("Đã ghi nhận bình chọn")).toBeVisible();
    await expect(readerPage.getByText("1 lượt", { exact: false })).toBeVisible();

    // Story B is unaffected.
    await readerPage.goto(`/story/${storyBSlug}`);
    await expect(readerPage.getByText("0 lượt", { exact: false })).toBeVisible();
  } finally {
    await readerContext.close();
  }
});
