# StoryVerse — FE ↔ BE integration (real API, no mock)

Goal: `story-fe` calls the 6 `story-be` microservices instead of mock/hardcoded data.

## Phase 0 — PostgreSQL (user action)

This machine has no Docker and no PostgreSQL. Install **PostgreSQL 16**:
- https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- During install: superuser password = `postgres`, port = `5432` (matches every
  `appsettings.Development.json` connection string).
- Leave Stack Builder unchecked.

After install, tell Claude — it runs `dotnet ef database update` for all 6 services
(creates `storyverse_authentication`, `storyverse_content`, `storyverse_community`,
`storyverse_library`, `storyverse_moderation`, `storyverse_notification`).

## Phase 1 — Backend gaps

- [x] Shared CORS extension `Be.StoryVerse.ApiCommon/Extensions/CorsServiceExtensions.cs`
      — `Cors:AllowedOrigins` config, defaults to localhost:5173. Wired into all 6
      API hosts (`AddStoryVerseCors` + `UseStoryVerseCors`).
- [x] Content dev seeder `Content.Api/Seed/DemoContentSeeder.cs` — 8 genres + 10
      Vietnamese horror stories with first chapters. Gated by `Seed:DemoContent`
      (true in Content `appsettings.Development.json`). Idempotent.
- [ ] Content: authorized admin story listing incl. every status — DEFERRED.
      Public `GET /v1/stories` is published-only; admin list + counts + get-by-id
      still need backend work. FE admin runs published-only against the real API.
- [x] Content chapter review workflow — real pre-publication gate. `ChapterStatus`:
      `Draft/Rejected → PendingReview → InReview → Published/Rejected`. A story
      stays `Draft` (hidden from the public) until its first chapter is approved.
      Moderator endpoints (`content.moderate`, granted to `Moderator` +
      `PlatformAdmin`): `GET /v1/chapters/pending-review`,
      `GET /v1/chapters/{id}/for-review`, `POST /v1/chapters/{id}/review`,
      `POST /v1/chapters/{id}/approve`, `POST /v1/chapters/{id}/reject {reason}`.
      Author side: `POST /v1/chapters/{id}/submit-for-review` (submit/resubmit).

## Phase 2 — FE service facades (`useRealApi` branch)

- [x] `storyService` → `contentApi` (list + counts; `get()` rejects — no by-id API)
- [ ] `reportService` → `moderationApi` — next
- [x] `reviewService` → `contentApi` chapter-review endpoints (real)
- [ ] library / notification / community facades — not yet

## Phase 3 — FE reader site (Canh Ba)

- [x] New `src/site/readerService.ts` — real Content API + hardcoded fallback.
- [x] `HomePage`, `FeaturedPage`, `TopicsPage` read it.
- [x] `StoryDetailPage`, `ChapterReaderPage` rebuilt on it (were ScaffoldNotice).

## Phase 4 — Run & smoke test  ✅ PASSING (2026-09-09)

- [x] PostgreSQL 18.6 installed, service `postgresql-x64-18`, localhost:5432, postgres/postgres.
- [x] All 6 migrations applied (`dotnet ef database update --project <Infra>` — the
      design-time factory carries the connection string; no `--startup-project`).
      Databases: storyverse_{authentication,content,community,library,moderation,notification}.
- [x] All 6 services running via `deploy/dev-run.ps1` (launch profiles → HTTPS ports
      58626 / 52175 / 52172 / 52173 / 52174 / 52176). Swagger 200 on all.
- [x] Content `DemoContentSeeder` inserted 8 genres + 10 stories + chapters on boot.
- [x] Accounts registered: `admin@storyverse.local` / `admin123` (PlatformAdmin —
      granted via SQL into `identity.user_roles`; the startup seeder only promotes
      on the *next* boot after registration), `reader@storyverse.local` / `reader123`.
- [x] End-to-end through the Vite proxy verified:
      `/api/content/v1/stories` → seeded list, `/api/authentication/v1/auth/login` → JWT,
      story detail + chapters + chapter content, CORS preflight returns the headers.

### Run it again later

1. PostgreSQL service starts with Windows — nothing to do.
2. `pwsh story-be-prj/deploy/dev-run.ps1`  → wait ~15s, check `deploy/.logs/*.log`
   for "Now listening on".  Stop: `Get-Process dotnet | Stop-Process`
3. `cd story-fe-prj && npm run dev`  (`.env.local` = `VITE_DATA_SOURCE=api`)
4. http://localhost:5173 — reader site pulls live data; login with the admin account.

If a service was rebuilt and won't bind its port, an old `dotnet` process is still
holding it — `Get-Process dotnet | Stop-Process` then rerun dev-run.ps1.

## Author "Đăng truyện" flow (2026-09-09)

The reader site now has a real author workspace (Canh Ba theme):

- `/tai-khoan` — login / register / account (reader-site auth; the admin `/login`
  stays admin-only and now bounces non-admins).
- `/tac-gia/dang-ky` — create author profile → the FE silently re-logs in to pick
  up the `author_id` JWT claim (no refresh endpoint exists).
- `/submit` — **public** "Đăng truyện" form (no login). 5 fields: tên truyện /
  tên tác giả / thể loại (dropdown, default "Sáng tác") / mô tả ngắn / nội dung.
  - not logged in → `POST /v1/stories/guest-publish` `[AllowAnonymous]` — stamps
    `AuthorProfileId = 0` + `Story.GuestAuthorName` (new nullable column, migration
    `20260909104444_AddStoryGuestAuthorName`). Story is public + shareable; the
    guest can't edit it afterwards. Byline shows the typed name (no `/author/:id`).
  - logged-in author → the existing `POST /v1/stories/quick-publish` (their story,
    editable at `/tac-gia`; pen-name field is pre-filled + locked).
- Genres: `GenreSeeder` now also seeds **"Sáng tác"** (`sang-tac`, order -2) +
  **"Chuyện có thật"** (`chuyen-co-that`, -1) so they sort first in `GET /v1/genres`.
- `/tac-gia` — "Truyện của tôi" (tracked in `localStorage["sv_author_stories"]` —
  there is no list-my-stories endpoint).
- `/tac-gia/truyen/:slug` — story workspace: add **Phần** (volume), add/publish
  **Chương** (chapter), change story status.
- `/tac-gia/truyen/:slug/chuong/:id` — chapter editor (edit / publish / remove).

Story model: **Truyện → (optional) Phần → Chương**. A story goes public the moment
its first chapter is published (Draft → Ongoing, automatic).

### Wipe Content story data (keep genres + admin), test authoring from scratch

`Content.Api/appsettings.Development.json` → `Seed:DemoContent: false` (already set).
`GenreSeeder` runs every Development boot and keeps the 10 seed genres present
(`sang-tac`, `chuyen-co-that`, + the 8 setting genres).

```
Get-Process dotnet | Stop-Process
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d storyverse_content -c "TRUNCATE TABLE content.chapters, content.volumes, content.story_genres, content.story_tags, content.stories, content.tags RESTART IDENTITY CASCADE;"
pwsh story-be-prj/deploy/dev-run.ps1
```
Leave `storyverse_authentication` alone (keeps `admin@storyverse.local` / `admin123`).
To also drop a test author: `DELETE FROM identity.user_roles/author_profiles/users WHERE "UserId"/"Id" = <id>;`

### Verified end-to-end (through the Vite proxy)

register → login → author-profile (`requiresTokenRefresh:true`) → re-login (token
now carries `roles:[Reader,Author]` + `author_id`) → quick-publish (story `Ongoing`)
→ add volume "Phần 2" → add chapter into it → `GET /v1/stories` lists the story.

## All 6 services wired FE↔BE (2026-09-09)

Community, Library, Moderation, Notification are now connected — the FE api clients
(`src/services/api/{community,library,moderation,notification}Api.ts`) call real
routes, `config.ts` marks all 6 `implemented: true`.

| Feature | FE surface | Backend |
|---|---|---|
| Chapter comments (+ reply / edit / delete) | `ChapterReaderPage` → `communityService` | `community /v1/comments*` |
| Story rating (1–5 + review) | `StoryDetailPage` "Tương tác" | `community /v1/ratings*` |
| Weekly vote | `StoryDetailPage` | `community /v1/votes*` |
| Bookshelf (4 shelves) + reading progress | `LibraryPage`, `AddToLibraryButton`, `ChapterReaderPage` | `library /v1/library*`, `/v1/reading-progress*` |
| File a report | `ReportDialog` on story/chapter → `reportService.fileReport` | `moderation POST /v1/reports` |
| Admin reports queue (real) | `/admin/reports*` → `reportService` (`useRealApi` branch) | `moderation /v1/reports*` (admin JWT) |
| Notification bell | `SiteLayout` → `notificationService` | `notification /v1/notifications*` |
| Browse (genre / status / sort / paginate) | `/browse` → `readerService.browseStories` | `content GET /v1/stories` |
| Public author profile + their stories | `/author/:id` | new `auth GET /v1/auth/authors/{id}` + `content ?author-profile-id=` |
| Genre management (list / create / edit / hide-show) | admin `/admin/genres` → `genreService` | `content /v1/genres` (+ `?include-inactive=true`), `POST/PUT/{slug}/hide` — `genres.manage` = PlatformAdmin |
| Genre picker on `/submit` and `/topics` | reader — `readerService.listGenres()` | `content GET /v1/genres` (DB-backed; the dev `GenreSeeder` only bootstraps a starter set) |

Backend additions this round: `content GET /v1/stories/{id:guid}` (`GetStoryByIdQuery`),
`content GET /v1/stories?author-profile-id=`, `auth GET /v1/auth/authors/{id}`
(`GetPublicAuthorProfileQuery`, anonymous).

### Reusable E2E test — `story-fe-prj/scripts/e2e.mjs`

```
# through the Vite proxy (needs `npm run dev`):
cd story-fe-prj && npm run e2e
# direct to the service ports (TLS-insecure, no dev server needed):
BASE=https://localhost npm run e2e
```
30 steps across all 6 services: register → author profile → re-login → **guest
publish (anonymous, stays Draft)** → quick-publish (Draft) → **admin approves
chapter 1 (story goes live)** → Phần 2 + submit chapter 2 for review →
**admin approves chapter 2** → 2nd reader comments/rates/votes → library +
reading progress → report → **admin genre create/update/hide** →
moderation reports review/resolve → notifications → **admin rejects a chapter,
author resubmits** → anonymous reads → author filter.
**30/30 pass** in both modes (verified 2026-09-09, chapter review workflow).

### Reset all test data (keeps genres + admin/reader accounts)

```
Get-Process dotnet | Stop-Process
$PSQL = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
& $PSQL -U postgres -h localhost -d storyverse_content     -c "TRUNCATE content.chapters, content.volumes, content.story_genres, content.story_tags, content.stories, content.tags RESTART IDENTITY CASCADE;"
& $PSQL -U postgres -h localhost -d storyverse_community    -c "TRUNCATE community.comments, community.ratings, community.votes RESTART IDENTITY CASCADE;"
& $PSQL -U postgres -h localhost -d storyverse_library      -c "TRUNCATE library.library_entries, library.reading_progress RESTART IDENTITY CASCADE;"
& $PSQL -U postgres -h localhost -d storyverse_moderation   -c "TRUNCATE moderation.reports, moderation.moderation_actions RESTART IDENTITY CASCADE;"
& $PSQL -U postgres -h localhost -d storyverse_notification -c "TRUNCATE notification.notifications RESTART IDENTITY CASCADE;"
& $PSQL -U postgres -h localhost -d storyverse_authentication -c "DELETE FROM identity.user_roles WHERE ""UserId"" > 2; DELETE FROM identity.author_profiles WHERE ""UserId"" > 2; DELETE FROM identity.users WHERE ""Id"" > 2;"
pwsh story-be-prj/deploy/dev-run.ps1
```

## Still deferred (documented gaps, not blocking)

- **No general event bus/consumer.** Chapter approve/reject now produces real
  notifications (Content → Notification over HTTP, `X-Service-Token` service auth;
  recipient user id resolved via `GET /v1/auth/internal/author-profiles/{id}`).
  Comment-reply notifications are still the FE dev-shim in `communityService`.
- Comments/ratings expose only numeric user ids → shown as `Người đọc #<id>`.
- Report summaries carry no target title / reporter name → `<Type> <id8>` / `Người dùng #<id>`.
- Moderation queue has no free-text search — admin `q` box is a no-op in API mode.
- No `Role.Moderator` grant path — the reports queue uses `admin@storyverse.local`.
- Moderation decisions are audit-only (Hide/Remove not applied to the content).
- `reviewService` has no aggregate counts for already-decided chapters (no listing
  endpoint for them) — Dashboard/queue "Approved"/"Rejected" counts always show `0`.
- `reviewService.listQueue`'s free-text `q` and `type` ("Story" vs "Chapter")
  filters are mock-mode-only — ignored against the real API (queue is chapter-only).
- Auth: no token-refresh endpoint (re-login after author-profile stays).
- Scheduled-chapter auto-publisher (no background job).
- `GET /v1/stories/mine` (author's own incl. drafts), admin all-status list, story
  counts endpoint.
