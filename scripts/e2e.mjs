// End-to-end smoke test: story-fe -> story-be, all 6 services.
// Runs the same HTTP paths the frontend uses.
//
//   npm run e2e                       (through the Vite proxy — needs `npm run dev`)
//   BASE=https://localhost npm run e2e   (direct to the service ports, TLS-insecure)
//
// Env: ADMIN_EMAIL / ADMIN_PASSWORD (default admin@storyverse.local / admin123).
//
// Reset (optional — the script uses unique per-run emails):
//   psql -d storyverse_content -c "TRUNCATE content.chapters, content.volumes,
//     content.story_genres, content.story_tags, content.stories, content.tags RESTART IDENTITY CASCADE;"
//   psql -d storyverse_community -c "TRUNCATE community.comments, community.ratings, community.votes RESTART IDENTITY CASCADE;"
//   psql -d storyverse_library -c "TRUNCATE library.library_entries, library.reading_progress RESTART IDENTITY CASCADE;"
//   psql -d storyverse_moderation -c "TRUNCATE moderation.reports, moderation.moderation_actions RESTART IDENTITY CASCADE;"
//   psql -d storyverse_notification -c "TRUNCATE notification.notifications RESTART IDENTITY CASCADE;"
//   psql -d storyverse_authentication -c "DELETE FROM identity.user_roles WHERE \"UserId\" > 2;
//     DELETE FROM identity.author_profiles WHERE \"UserId\" > 2; DELETE FROM identity.users WHERE \"Id\" > 2;"

const PROXY_BASE = "http://localhost:5173/api";
const DIRECT = process.env.BASE && process.env.BASE !== PROXY_BASE;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@storyverse.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const PORTS = {
  authentication: 58626,
  content: 52175,
  community: 52172,
  library: 52173,
  moderation: 52174,
  notification: 52176,
};

if (DIRECT) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const base = process.env.BASE || PROXY_BASE;
const ts = Date.now();

function url(service, path) {
  if (DIRECT) return `${base.replace(/\/$/, "")}:${PORTS[service]}${path}`;
  return `${base.replace(/\/$/, "")}/${service}${path}`;
}

async function req(service, path, { method = "GET", body, token, expect = [200, 201] } = {}) {
  const res = await fetch(url(service, path), {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let env = null;
  try {
    env = text ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }
  const ok = Array.isArray(expect) ? expect.includes(res.status) : res.status === expect;
  if (!ok) {
    const msg = env?.error?.message || env?.title || text.slice(0, 200);
    throw new Error(`${method} ${service}${path} -> ${res.status} ${msg}`);
  }
  return env && Object.prototype.hasOwnProperty.call(env, "data") ? env.data : env;
}

const results = [];
async function step(name, fn) {
  try {
    const detail = (await fn()) || "";
    results.push({ name, ok: true, detail });
    console.log(`  ok  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (err) {
    results.push({ name, ok: false, detail: err.message });
    console.log(`FAIL  ${name} — ${err.message}`);
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function main() {
  if (!DIRECT) {
    try {
      await fetch("http://localhost:5173/");
    } catch {
      console.error(
        "Vite dev server not reachable at http://localhost:5173 — run `npm run dev` (or use BASE=https://localhost).",
      );
      process.exit(2);
    }
  }

  const S = {}; // shared state

  await step("health: 6 services", async () => {
    const names = Object.keys(PORTS);
    await Promise.all(
      names.map((n) =>
        fetch(url(n, "/swagger/index.html")).catch(() => {
          throw new Error(`${n} down`);
        }),
      ),
    );
    return names.join(", ");
  });

  await step("register readerA", async () => {
    S.emailA = `e2e+${ts}-a@storyverse.local`;
    const d = await req("authentication", "/v1/auth/register", {
      method: "POST",
      body: { email: S.emailA, password: "Passw0rd!", displayName: "E2E A" },
    });
    S.userA = d.userId;
    return `userId ${d.userId}`;
  });

  await step("login readerA", async () => {
    const d = await req("authentication", "/v1/auth/login", {
      method: "POST",
      body: { email: S.emailA, password: "Passw0rd!" },
    });
    S.tokenA = d.accessToken;
    const me = await req("authentication", "/v1/auth/me", { token: S.tokenA });
    assert(me.roles.includes("Reader"), "expected Reader role");
  });

  await step("become author", async () => {
    const d = await req("authentication", "/v1/auth/author-profile", {
      method: "POST",
      token: S.tokenA,
      body: { penName: `E2E Author ${ts}`, bio: "e2e" },
    });
    S.authorProfileId = d.authorProfileId;
    assert(d.requiresTokenRefresh === true, "expected requiresTokenRefresh");
    return `authorProfileId ${d.authorProfileId}`;
  });

  await step("re-login readerA (author_id claim)", async () => {
    const d = await req("authentication", "/v1/auth/login", {
      method: "POST",
      body: { email: S.emailA, password: "Passw0rd!" },
    });
    S.tokenA = d.accessToken;
    const claims = JSON.parse(Buffer.from(S.tokenA.split(".")[1], "base64").toString());
    assert(claims.author_id, "token missing author_id claim");
    assert([].concat(claims.roles).includes("Author"), "token missing Author role");
  });

  await step("auth: get current user (me) matches the token", async () => {
    const me = await req("authentication", "/v1/auth/me", { token: S.tokenA });
    assert(Number(me.userId ?? me.id) === S.userA, `me.userId mismatch: ${JSON.stringify(me)}`);
    assert(me.email === S.emailA, `me.email mismatch, got ${me.email}`);
    assert([].concat(me.roles).includes("Author"), "me.roles missing Author");
  });

  await step("auth: get my author profile", async () => {
    const profile = await req("authentication", "/v1/auth/author-profile", { token: S.tokenA });
    assert(
      Number(profile.authorProfileId ?? profile.id) === S.authorProfileId,
      `authorProfileId mismatch: ${JSON.stringify(profile)}`,
    );
    assert(profile.penName === `E2E Author ${ts}`, `penName mismatch: ${profile.penName}`);
  });

  await step("list genres", async () => {
    const rows = await req("content", "/v1/genres");
    assert(rows.length >= 10, `expected >=10 genres, got ${rows.length}`);
    const slugs = rows.map((g) => g.slug);
    assert(
      slugs.includes("sang-tac") && slugs.includes("chuyen-co-that"),
      "missing sang-tac/chuyen-co-that",
    );
    assert(rows[0].slug === "sang-tac", `expected 'sang-tac' first, got '${rows[0].slug}'`);
    S.genreSlug = "sang-tac";
    return `${rows.length} genres, first ${rows[0].slug}`;
  });

  await step("guest publish (anonymous, no token)", async () => {
    const d = await req("content", "/v1/stories/guest-publish", {
      method: "POST",
      body: {
        guestPenName: "Khách E2E",
        title: `E2E Khách ${ts}`,
        description: "Đăng ẩn danh.",
        genres: [{ genreSlug: "sang-tac", isPrimary: true }],
        chapterContent: "Không cần đăng nhập vẫn đăng được truyện. ".repeat(10),
      },
    });
    S.guestStorySlug = d.slug;
    S.guestStoryId = d.id;
    assert(d.status === "Draft", `expected Draft (pending review), got ${d.status}`);
    // Anonymous by-slug 404s while pending review (same rule as any Draft story) —
    // guestAuthorName is already on the creation response itself.
    assert(
      d.guestAuthorName === "Khách E2E",
      `guestAuthorName not persisted: ${d.guestAuthorName}`,
    );
    return `${d.slug}`;
  });

  await step("guest publish: guest can never edit (no token rejected)", async () => {
    // The guest story is owned by AuthorProfileId 0 — no account can ever "be" the
    // guest, so an edit attempt with no token must be rejected at the auth layer.
    await req("content", `/v1/stories/${S.guestStoryId}`, {
      method: "PUT",
      body: {
        title: "Chiếm quyền chỉnh sửa",
        description: "Không nên sửa được.",
        language: "vi",
        ageRating: "General",
        contentType: "Original",
      },
      expect: [401],
    });
  });

  await step("quick-publish story", async () => {
    const d = await req("content", "/v1/stories/quick-publish", {
      method: "POST",
      token: S.tokenA,
      body: {
        title: `E2E Truyện ${ts}`,
        description: "Truyện kiểm thử end-to-end.",
        language: "vi",
        ageRating: "General",
        contentType: "Original",
        genres: [{ genreSlug: S.genreSlug, isPrimary: true }],
        tags: ["e2e"],
        chapterTitle: "Chương 1",
        chapterContent: "Đêm đó tôi nghe tiếng gõ cửa. ".repeat(20),
        completeImmediately: false,
      },
    });
    S.storyId = d.story.id;
    S.storySlug = d.story.slug;
    S.chapter1Id = d.firstChapter.id;
    assert(d.story.status === "Draft", `expected Draft (pending review), got ${d.story.status}`);
    assert(
      d.firstChapter.status === "PendingReview",
      `expected PendingReview, got ${d.firstChapter.status}`,
    );
    return `${S.storySlug} (${S.storyId.slice(0, 8)})`;
  });

  await step("admin approves chapter 1 (story goes live)", async () => {
    const login = await req("authentication", "/v1/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    S.tokenAdmin = login.accessToken;
    await req("content", `/v1/chapters/${S.chapter1Id}/review`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    await req("content", `/v1/chapters/${S.chapter1Id}/approve`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    const story = await req("content", `/v1/stories/by-slug/${S.storySlug}`);
    assert(story.status === "Ongoing", `expected Ongoing after approval, got ${story.status}`);
  });

  await step('add volume "Phần 2"', async () => {
    const d = await req("content", `/v1/stories/${S.storyId}/volumes`, {
      method: "POST",
      token: S.tokenA,
      body: { title: "Phần 2", orderIndex: 2 },
    });
    S.volumeId = d.id;
  });

  await step("add + submit chapter 2 in Phần 2 for review", async () => {
    const d = await req("content", `/v1/stories/${S.storyId}/chapters`, {
      method: "POST",
      token: S.tokenA,
      body: {
        title: "Chương 2",
        content: "Sáng ra, đôi dép quay mũi vào trong nhà. ".repeat(15),
        orderIndex: 2,
        volumeId: S.volumeId,
        publishImmediately: true,
      },
    });
    S.chapter2Id = d.id;
    assert(d.status === "PendingReview", `expected PendingReview, got ${d.status}`);
  });

  await step("admin approves chapter 2", async () => {
    await req("content", `/v1/chapters/${S.chapter2Id}/review`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    const d = await req("content", `/v1/chapters/${S.chapter2Id}/approve`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    assert(d.status === "Published", `expected Published, got ${d.status}`);
  });

  await step("register + login readerB", async () => {
    S.emailB = `e2e+${ts}-b@storyverse.local`;
    await req("authentication", "/v1/auth/register", {
      method: "POST",
      body: { email: S.emailB, password: "Passw0rd!", displayName: "E2E B" },
    });
    const d = await req("authentication", "/v1/auth/login", {
      method: "POST",
      body: { email: S.emailB, password: "Passw0rd!" },
    });
    S.tokenB = d.accessToken;
    S.userB = JSON.parse(Buffer.from(d.accessToken.split(".")[1], "base64").toString()).sub;
    S.userB = Number(S.userB);
  });

  await step("comment on chapter 2", async () => {
    const d = await req("community", "/v1/comments", {
      method: "POST",
      token: S.tokenB,
      body: { chapterId: S.chapter2Id, content: "Chương này rợn thật!" },
    });
    S.commentId = d.id;
    assert(Number(d.authorUserId) === S.userB, "comment author mismatch");
  });

  await step("reply to the comment", async () => {
    const d = await req("community", `/v1/comments/${S.commentId}/replies`, {
      method: "POST",
      token: S.tokenB,
      body: { content: "Đồng ý, phần kết bất ngờ." },
    });
    S.replyId = d.id;
  });

  await step("edit the comment", async () => {
    const d = await req("community", `/v1/comments/${S.commentId}`, {
      method: "PUT",
      token: S.tokenB,
      body: { content: "Chương này rợn thật! (đã sửa)" },
    });
    assert(d.updatedAt, "expected updatedAt set");
  });

  await step("list comments (tree)", async () => {
    const d = await req("community", `/v1/comments?chapter-id=${S.chapter2Id}&page-size=50`);
    assert(d.totalCount >= 2, `expected >=2 comments, got ${d.totalCount}`);
    const reply = d.items.find((c) => c.id === S.replyId);
    assert(reply && reply.parentCommentId === S.commentId, "reply not linked to parent");
  });

  await step("delete the reply comment (idempotent)", async () => {
    const d = await req("community", `/v1/comments/${S.replyId}`, {
      method: "DELETE",
      token: S.tokenB,
    });
    assert(d.status === "Deleted", `expected Deleted, got ${d.status}`);
    // Second delete on an already-deleted comment must not throw.
    const again = await req("community", `/v1/comments/${S.replyId}`, {
      method: "DELETE",
      token: S.tokenB,
    });
    assert(again.status === "Deleted", `expected still Deleted, got ${again.status}`);
  });

  await step("admin: hide then unhide a comment", async () => {
    const hidden = await req("community", `/v1/comments/${S.commentId}/hide`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    assert(hidden.status === "Hidden", `expected Hidden, got ${hidden.status}`);
    const unhidden = await req("community", `/v1/comments/${S.commentId}/unhide`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    assert(unhidden.status === "Visible", `expected Visible, got ${unhidden.status}`);
  });

  await step("rate the story", async () => {
    const d = await req("community", "/v1/ratings", {
      method: "PUT",
      token: S.tokenB,
      body: { storyId: S.storyId, score: 4, reviewText: "Khá hay." },
    });
    assert(d.score === 4, `expected score 4, got ${d.score}`);
    const mine = await req("community", `/v1/ratings/mine?story-id=${S.storyId}`, {
      token: S.tokenB,
    });
    assert(mine.score === 4, "my rating not persisted");
    const list = await req("community", `/v1/ratings?story-id=${S.storyId}`);
    assert(list.totalCount >= 1, "ratings list empty");
  });

  await step("rating: upsert replaces + get-my-rating reflects it", async () => {
    await req("community", "/v1/ratings", {
      method: "PUT",
      token: S.tokenB,
      body: { storyId: S.storyId, score: 5, reviewText: "Xem lại, hay hơn tôi tưởng." },
    });
    const mine = await req("community", `/v1/ratings/mine?story-id=${S.storyId}`, {
      token: S.tokenB,
    });
    assert(mine.score === 5, `expected upserted score 5, got ${mine.score}`);
  });

  await step("vote (weekly)", async () => {
    const first = await req("community", "/v1/votes", {
      method: "POST",
      token: S.tokenB,
      body: { storyId: S.storyId },
    });
    assert(first.recorded === true, "first vote should be recorded");
    const dup = await req("community", "/v1/votes", {
      method: "POST",
      token: S.tokenB,
      body: { storyId: S.storyId },
    });
    assert(dup.recorded === false, "second vote should be rejected");
    const count = await req("community", `/v1/votes/count?story-id=${S.storyId}`);
    assert(count.weekVoteCount >= 1, "vote count not >=1");
  });

  await step("library: add + change shelf + list", async () => {
    await req("library", "/v1/library", {
      method: "POST",
      token: S.tokenB,
      body: { storyId: S.storyId, shelfStatus: "Reading" },
      expect: [200, 201],
    });
    await req("library", `/v1/library/${S.storyId}/shelf-status`, {
      method: "PUT",
      token: S.tokenB,
      body: { shelfStatus: "Completed" },
    });
    const list = await req("library", "/v1/library?shelf-status=Completed", { token: S.tokenB });
    assert(
      list.items.some((e) => e.storyId === S.storyId),
      "story not on Completed shelf",
    );
  });

  await step("library: reading progress", async () => {
    await req("library", `/v1/reading-progress/${S.storyId}`, {
      method: "PUT",
      token: S.tokenB,
      body: { lastChapterId: S.chapter2Id, scrollPercent: 42 },
    });
    const got = await req("library", `/v1/reading-progress/${S.storyId}`, { token: S.tokenB });
    assert(got.lastChapterId === S.chapter2Id, "reading progress not persisted");
    const cont = await req("library", "/v1/reading-progress/continue-reading", { token: S.tokenB });
    assert(cont.items.length >= 1, "continue-reading empty");
  });

  await step("library: remove entry", async () => {
    await req("library", `/v1/library/${S.storyId}`, {
      method: "DELETE",
      token: S.tokenB,
    });
    const list = await req("library", "/v1/library", { token: S.tokenB });
    assert(
      !list.items.some((e) => e.storyId === S.storyId),
      "story still in library after remove",
    );
  });

  await step("submit report (readerB)", async () => {
    const d = await req("moderation", "/v1/reports", {
      method: "POST",
      token: S.tokenB,
      body: {
        targetType: "Story",
        targetId: S.storyId,
        reason: "Spam",
        description: "Nghi ngờ spam.",
      },
    });
    S.reportId = d.id;
    assert(d.status === "Pending", `expected Pending, got ${d.status}`);
  });

  await step("admin login", async () => {
    const d = await req("authentication", "/v1/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    S.tokenAdmin = d.accessToken;
    const me = await req("authentication", "/v1/auth/me", { token: S.tokenAdmin });
    assert(
      me.roles.includes("PlatformAdmin"),
      `admin lacks PlatformAdmin — add ${ADMIN_EMAIL} to Seed:PlatformAdminEmails and reboot Authentication.Api`,
    );
  });

  await step("admin: genre create / update / hide", async () => {
    const slug = `e2e-genre-${ts}`;
    const created = await req("content", "/v1/genres", {
      method: "POST",
      token: S.tokenAdmin,
      body: { name: `E2E Genre ${ts}`, description: "e2e", displayOrder: 99 },
    });
    assert(created.slug === slug, `unexpected slug ${created.slug}`);
    await req("content", `/v1/genres/${slug}`, {
      method: "PUT",
      token: S.tokenAdmin,
      body: { name: `E2E Genre ${ts} v2`, description: "e2e2", displayOrder: 5, isActive: true },
    });
    await req("content", `/v1/genres/${slug}/hide`, { method: "POST", token: S.tokenAdmin });
    const publicList = await req("content", "/v1/genres");
    assert(!publicList.some((g) => g.slug === slug), "hidden genre still in public list");
    const adminList = await req("content", "/v1/genres?include-inactive=true", {
      token: S.tokenAdmin,
    });
    assert(
      adminList.some((g) => g.slug === slug && !g.isActive),
      "hidden genre not in admin list",
    );
    // anonymous create must be rejected
    await req("content", "/v1/genres", {
      method: "POST",
      body: { name: "nope", displayOrder: 1 },
      expect: [401, 403],
    });
  });

  await step("moderation: list + review + resolve", async () => {
    const list = await req("moderation", "/v1/reports?status=Pending", { token: S.tokenAdmin });
    assert(
      list.items.some((r) => r.id === S.reportId),
      "report not in Pending queue",
    );
    const rev = await req("moderation", `/v1/reports/${S.reportId}/review`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    assert(rev.status === "Reviewing", `expected Reviewing, got ${rev.status}`);
    const res = await req("moderation", `/v1/reports/${S.reportId}/resolve`, {
      method: "POST",
      token: S.tokenAdmin,
      body: { action: "Warn", note: "Đã nhắc nhở tác giả." },
    });
    assert(res.status === "Resolved", `expected Resolved, got ${res.status}`);
    assert((res.actions || []).length >= 1, "no moderation action recorded");
  });

  await step("moderation: report detail includes action history", async () => {
    const detail = await req("moderation", `/v1/reports/${S.reportId}`, { token: S.tokenAdmin });
    assert(detail.status === "Resolved", `expected Resolved, got ${detail.status}`);
    assert(
      (detail.actions || []).some((a) => a.action === "Warn"),
      `expected a Warn action in history, got ${JSON.stringify(detail.actions)}`,
    );
  });

  await step("moderation: dismiss a fresh report", async () => {
    const filed = await req("moderation", "/v1/reports", {
      method: "POST",
      token: S.tokenB,
      body: {
        targetType: "Story",
        targetId: S.storyId,
        reason: "Other",
        description: "Báo cáo để kiểm thử huỷ.",
      },
    });
    await req("moderation", `/v1/reports/${filed.id}/review`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    const dismissed = await req("moderation", `/v1/reports/${filed.id}/dismiss`, {
      method: "POST",
      token: S.tokenAdmin,
      body: { note: "Không đủ căn cứ." },
    });
    assert(dismissed.status === "Dismissed", `expected Dismissed, got ${dismissed.status}`);
  });

  await step("notifications: create + list + count", async () => {
    await req("notification", "/v1/notifications", {
      method: "POST",
      token: S.tokenB,
      body: { userId: S.userB, type: "SystemAnnouncement", title: "Chào mừng", body: "E2E test" },
    });
    const cr = await req("notification", "/v1/notifications", {
      method: "POST",
      token: S.tokenB,
      body: {
        userId: S.userB,
        type: "CommentReply",
        title: "Có trả lời",
        body: "Ai đó trả lời bạn",
        refType: "Comment",
        refId: S.commentId,
      },
    });
    S.notifId = cr.id;
    const list = await req("notification", "/v1/notifications", { token: S.tokenB });
    assert(list.totalCount >= 2, `expected >=2 notifications, got ${list.totalCount}`);
    const cnt = await req("notification", "/v1/notifications/unread-count", { token: S.tokenB });
    assert(cnt.count >= 2, `expected unread >=2, got ${cnt.count}`);
  });

  await step("notifications: mark read + read all", async () => {
    await req("notification", `/v1/notifications/${S.notifId}/read`, {
      method: "POST",
      token: S.tokenB,
    });
    const all = await req("notification", "/v1/notifications/read-all", {
      method: "POST",
      token: S.tokenB,
    });
    assert(all.count === 0, `expected 0 unread after read-all, got ${all.count}`);
  });

  await step("author: update story directly (PUT)", async () => {
    const updated = await req("content", `/v1/stories/${S.storyId}`, {
      method: "PUT",
      token: S.tokenA,
      body: {
        title: `E2E Truyện ${ts} (đã sửa)`,
        description: "Mô tả đã được cập nhật qua PUT trực tiếp.",
        language: "vi",
        ageRating: "General",
        contentType: "Original",
      },
    });
    assert(updated.title.endsWith("(đã sửa)"), `title not updated: ${updated.title}`);
    const reread = await req("content", `/v1/stories/${S.storyId}`);
    assert(reread.title === updated.title, "updated title did not persist");
    assert(reread.description.includes("cập nhật"), "updated description did not persist");
  });

  await step("author: AssignStoryGenres validation errors", async () => {
    // Duplicate slug in the payload -> FluentValidation failure -> 400.
    await req("content", `/v1/stories/${S.storyId}/genres`, {
      method: "PUT",
      token: S.tokenA,
      body: {
        genres: [
          { genreSlug: S.genreSlug, isPrimary: true },
          { genreSlug: S.genreSlug, isPrimary: false },
        ],
      },
      expect: [400],
    });
    // Two genres both marked primary -> FluentValidation failure -> 400.
    await req("content", `/v1/stories/${S.storyId}/genres`, {
      method: "PUT",
      token: S.tokenA,
      body: {
        genres: [
          { genreSlug: "sang-tac", isPrimary: true },
          { genreSlug: "chuyen-co-that", isPrimary: true },
        ],
      },
      expect: [400],
    });
    // A slug that doesn't exist passes validation shape but fails the
    // handler's active-genre lookup -> BusinessRuleException -> 422.
    await req("content", `/v1/stories/${S.storyId}/genres`, {
      method: "PUT",
      token: S.tokenA,
      body: { genres: [{ genreSlug: "khong-ton-tai-genre", isPrimary: true }] },
      expect: [422],
    });
  });

  await step("author: AssignStoryTags", async () => {
    await req("content", `/v1/stories/${S.storyId}/tags`, {
      method: "PUT",
      token: S.tokenA,
      body: { tags: ["e2e", "kinh-di", "moi"] },
    });
    const reread = await req("content", `/v1/stories/${S.storyId}`);
    assert(reread.tags.includes("kinh-di") && reread.tags.includes("moi"), `tags not updated: ${JSON.stringify(reread.tags)}`);
  });

  await step("author: illegal ChangeStoryStatus transition", async () => {
    // Story is Ongoing; Ongoing -> Draft is not in StoryStatusPolicy's allowed
    // manual transitions -> BusinessRuleException -> 422.
    await req("content", `/v1/stories/${S.storyId}/status`, {
      method: "POST",
      token: S.tokenA,
      body: { targetStatus: "Draft" },
      expect: [422],
    });
  });

  await step("author: schedule then cancel-schedule a chapter", async () => {
    const draft = await req("content", `/v1/stories/${S.storyId}/chapters`, {
      method: "POST",
      token: S.tokenA,
      body: {
        title: "Chương nháp (lịch đăng)",
        content: "Chương này sẽ được lên lịch rồi huỷ lịch. ".repeat(10),
        orderIndex: 4,
        publishImmediately: false,
      },
    });
    S.scheduledChapterId = draft.id;
    assert(draft.status === "Draft", `expected Draft, got ${draft.status}`);

    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduled = await req("content", `/v1/chapters/${S.scheduledChapterId}/schedule`, {
      method: "POST",
      token: S.tokenA,
      body: { scheduledAt },
    });
    assert(scheduled.status === "Scheduled", `expected Scheduled, got ${scheduled.status}`);

    const cancelled = await req("content", `/v1/chapters/${S.scheduledChapterId}/cancel-schedule`, {
      method: "POST",
      token: S.tokenA,
    });
    assert(cancelled.status === "Draft", `expected Draft after cancel, got ${cancelled.status}`);
  });

  await step("author: remove a published chapter", async () => {
    const d = await req("content", `/v1/stories/${S.storyId}/chapters`, {
      method: "POST",
      token: S.tokenA,
      body: {
        title: "Chương sẽ bị gỡ",
        content: "Chương này sẽ được duyệt rồi gỡ bỏ. ".repeat(10),
        orderIndex: 5,
        publishImmediately: true,
      },
    });
    const removableChapterId = d.id;
    assert(d.status === "PendingReview", `expected PendingReview, got ${d.status}`);

    await req("content", `/v1/chapters/${removableChapterId}/review`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    const approved = await req("content", `/v1/chapters/${removableChapterId}/approve`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    assert(approved.status === "Published", `expected Published, got ${approved.status}`);

    const removed = await req("content", `/v1/chapters/${removableChapterId}/remove`, {
      method: "POST",
      token: S.tokenA,
    });
    assert(removed.status === "Removed", `expected Removed, got ${removed.status}`);
  });

  await step("content: direct POST /stories + GET by-id/by-slug cross-check", async () => {
    const bare = await req("content", "/v1/stories", {
      method: "POST",
      token: S.tokenA,
      body: {
        title: `E2E Truyện trần ${ts}`,
        description: "Tạo trực tiếp, không qua quick-publish.",
        language: "vi",
        ageRating: "General",
        contentType: "Original",
      },
    });
    assert(bare.status === "Draft", `expected Draft, got ${bare.status}`);
    const byId = await req("content", `/v1/stories/${bare.id}`, { token: S.tokenA });
    assert(byId.id === bare.id, "bare story by-id id mismatch");

    // Same cross-check against the main published story, by both lookups.
    const bySlug = await req("content", `/v1/stories/by-slug/${S.storySlug}`);
    const mainById = await req("content", `/v1/stories/${S.storyId}`);
    assert(bySlug.id === mainById.id, "by-slug/by-id id mismatch for main story");
    assert(mainById.slug === bySlug.slug, "by-slug/by-id slug mismatch for main story");
  });

  await step("admin rejects a chapter, author resubmits", async () => {
    const d = await req("content", `/v1/stories/${S.storyId}/chapters`, {
      method: "POST",
      token: S.tokenA,
      body: {
        title: "Chương 3 (nháp lỗi)",
        content: "Bản nháp sẽ bị từ chối. ".repeat(10),
        orderIndex: 3,
        publishImmediately: true,
      },
    });
    const chapter3Id = d.id;
    assert(d.status === "PendingReview", `expected PendingReview, got ${d.status}`);

    await req("content", `/v1/chapters/${chapter3Id}/review`, {
      method: "POST",
      token: S.tokenAdmin,
    });
    const rejected = await req("content", `/v1/chapters/${chapter3Id}/reject`, {
      method: "POST",
      token: S.tokenAdmin,
      body: { reason: "Thiếu nội dung, vui lòng bổ sung." },
    });
    assert(rejected.status === "Rejected", `expected Rejected, got ${rejected.status}`);
    assert(rejected.rejectionReason, "rejectionReason not set");

    const resubmitted = await req("content", `/v1/chapters/${chapter3Id}/submit-for-review`, {
      method: "POST",
      token: S.tokenA,
    });
    assert(
      resubmitted.status === "PendingReview",
      `expected PendingReview after resubmit, got ${resubmitted.status}`,
    );
  });

  await step("anonymous reads (content)", async () => {
    const list = await req("content", "/v1/stories?sort-by=publishedAt&sort-direction=desc");
    assert(list.items.length > 0, "public listing empty");
    const bySlug = await req("content", `/v1/stories/by-slug/${S.storySlug}`);
    assert(bySlug.id === S.storyId, "by-slug id mismatch");
    const byId = await req("content", `/v1/stories/${S.storyId}`);
    assert(byId.slug === S.storySlug, "by-id slug mismatch");
    const chapters = await req("content", `/v1/stories/${S.storyId}/chapters`);
    assert(
      chapters.some((c) => c.id === S.chapter2Id && c.status === "Published"),
      "chapter 2 not public",
    );
    const content = await req("content", `/v1/chapters/${S.chapter2Id}`);
    assert(content.content && content.content.length > 0, "chapter content empty");
  });

  await step("public author profile + author filter", async () => {
    const author = await req("authentication", `/v1/auth/authors/${S.authorProfileId}`);
    assert(author.penName, "public author has no penName");
    const byAuthor = await req(
      "content",
      `/v1/stories?author-profile-id=${S.authorProfileId}&page-size=10`,
    );
    assert(
      byAuthor.items.some((s) => s.id === S.storyId),
      "author filter did not return the story",
    );
  });

  // ---- summary ----
  console.log("\n" + "=".repeat(60));
  const pad = Math.max(...results.map((r) => r.name.length));
  let failed = 0;
  results.forEach((r, i) => {
    if (!r.ok) failed++;
    const tag = r.ok ? "PASS" : "FAIL";
    console.log(`[${String(i + 1).padStart(2, "0")}] ${tag}  ${r.name.padEnd(pad)}  ${r.detail}`);
  });
  console.log("=".repeat(60));
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("\nUNEXPECTED:", err);
  process.exit(1);
});
