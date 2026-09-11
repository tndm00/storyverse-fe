// Domain enums. The story/chapter sets mirror the backend (Content.Domain/Enums).
// REVIEW_STATUS is the FE's mapping of the backend's pending-review chapter
// statuses (see src/services/reviewService.ts).

export const STORY_STATUS = ["Draft", "Ongoing", "Completed", "Hiatus", "Dropped"] as const;
export type StoryStatus = (typeof STORY_STATUS)[number];

export const CHAPTER_STATUS = ["Draft", "Scheduled", "Published", "Removed"] as const;
export type ChapterStatus = (typeof CHAPTER_STATUS)[number];

export const REVIEW_STATUS = ["Pending", "Reviewing", "Approved", "Rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const REPORT_REASON = ["Copyright", "Inappropriate", "Spam", "Other"] as const;
export type ReportReason = (typeof REPORT_REASON)[number];

export const REPORT_STATUS = ["Pending", "Reviewing", "Resolved", "Dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

export const MODERATION_ACTION = ["Dismiss", "Warn", "Hide", "Remove"] as const;
export type ModerationAction = (typeof MODERATION_ACTION)[number];

export const TARGET_TYPE = ["Story", "Chapter", "Comment"] as const;
export type TargetType = (typeof TARGET_TYPE)[number];

// value -> antd Tag color
export const STATUS_TAG_COLOR: Record<string, string> = {
  // story
  Draft: "default",
  Ongoing: "processing",
  Completed: "success",
  Hiatus: "warning",
  Dropped: "error",
  // chapter
  Scheduled: "cyan",
  Published: "success",
  Removed: "error",
  // review
  Pending: "gold",
  Reviewing: "processing",
  Approved: "success",
  Rejected: "error",
  // report
  Resolved: "success",
  Dismissed: "default",
};

export const REASON_TAG_COLOR: Record<string, string> = {
  Copyright: "volcano",
  Inappropriate: "red",
  Spam: "orange",
  Other: "default",
};

export const ACTION_TAG_COLOR: Record<string, string> = {
  Dismiss: "default",
  Warn: "gold",
  Hide: "orange",
  Remove: "error",
};

// ---------------------------------------------------------------------------
// Auth / session
// ---------------------------------------------------------------------------

export const AUTH_TOKEN_KEY = "sv_admin_token";

export const AUTH_REFRESH_TOKEN_KEY = "sv_admin_refresh_token";

export const BEARER_TOKEN_TYPE = "Bearer";

// Roles allowed into the admin console. Matched loosely (case / separators
// ignored) so both underscore-style ("PLATFORM_ADMIN") and the backend enum
// names ("PlatformAdmin") pass — see src/services/authService.ts.
export const ADMIN_CONSOLE_ROLES = ["PlatformAdmin", "Moderator"] as const;

// Shown on the login screen (seeded backend admin account).
export const DEMO_CREDENTIALS = { email: "admin@storyverse.local", password: "admin123" };

// ---------------------------------------------------------------------------
// Pagination / timing
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Routes — absolute paths for navigation (navigate(), <Link to>, <Navigate to>).
// Two areas: the public reader site (src/site) and the admin console
// (src/admin). Route *patterns* live in the *Routes.tsx files.
// ---------------------------------------------------------------------------

// The admin console is deliberately NOT mounted at the guessable "/admin" —
// it lives under this slug instead, so it isn't found by probing common
// paths. Change it here only (adminRoutes.tsx reads it too); everything
// under ROUTES.admin.* is derived from it.
export const ADMIN_BASE_PATH = "console-7f2k";

export const ROUTES = {
  // public reader site
  home: "/",
  browse: "/kham-pha",
  featured: "/noi-bat",
  topics: "/theo-chu-de",
  community: "/cong-dong",
  submit: "/dang-truyen",
  library: "/tu-truyen",
  story: (slug: string) => `/truyen/${slug}`,
  chapter: (slug: string, order: string | number) => `/truyen/${slug}/chuong/${order}`,
  author: (id: string | number) => `/nguoi-ke/${id}`,

  // reader-site account + author workspace
  account: "/tai-khoan",
  authorStudio: "/tac-gia",
  authorOnboard: "/tac-gia/dang-ky",
  authorPublish: "/tac-gia/dang-truyen",
  authorStory: (slug: string) => `/tac-gia/truyen/${slug}`,
  authorChapter: (slug: string, chapterId: string) => `/tac-gia/truyen/${slug}/chuong/${chapterId}`,

  // auth (gate for the admin console)
  login: "/login",

  // admin console
  admin: {
    dashboard: `/${ADMIN_BASE_PATH}`,
    reviewQueue: `/${ADMIN_BASE_PATH}/review`,
    rejectedQueue: `/${ADMIN_BASE_PATH}/review/rejected`,
    reports: `/${ADMIN_BASE_PATH}/reports`,
    comments: `/${ADMIN_BASE_PATH}/comments`,
    stories: `/${ADMIN_BASE_PATH}/stories`,
    genres: `/${ADMIN_BASE_PATH}/genres`,
    reviewItem: (id: string) => `/${ADMIN_BASE_PATH}/review/${id}`,
    report: (id: string) => `/${ADMIN_BASE_PATH}/reports/${id}`,
  },

  notFound: "/404",
} as const;

// Section names — reused by the admin sidebar menu, breadcrumbs and page headers.
export const LABELS = {
  dashboard: "Dashboard",
  reviewQueue: "Review queue",
  rejectedQueue: "Bị từ chối",
  reports: "Reports",
  comments: "Bình luận",
  stories: "Stories",
  genres: "Thể loại",
} as const;

// Reader-site (Canh Ba) branding.
export const SITE_LABELS = {
  brand: "Canh Ba",
  tagline: "Chuyện kể lúc nửa đêm",
  signIn: "Đăng nhập",
} as const;

// ---------------------------------------------------------------------------
// User-facing messages — errors and success toasts.
// ---------------------------------------------------------------------------

export const MESSAGES = {
  auth: {
    invalidCredentials: "Invalid email or password.",
    googleLoginFailed: "Đăng nhập bằng Google thất bại. Vui lòng thử lại.",
    notAllowed: "This account is not allowed in the admin console.",
    sessionExpired: "Session expired.",
    invalidSession: "Invalid session.",
    reauthNeeded: "Vui lòng đăng nhập lại để hoàn tất.",
    notAuthor: "Bạn cần tạo hồ sơ tác giả trước khi đăng truyện.",
    genresEmpty:
      "Hệ thống chưa có thể loại nào. Vui lòng liên hệ quản trị viên để thêm thể loại trước khi đăng truyện.",
  },
  review: {
    notFound: "Review item not found.",
    onlyPendingCanStart: "Only pending items can be started.",
    reasonRequired: "A reason is required to reject.",
    started: "Review started",
    approved: "Approved & published",
    rejected: "Submission rejected",
    reapproveConfirmTitle: "Đưa chương này về hàng đợi duyệt?",
    reapproveConfirmContent:
      "Chương sẽ chuyển từ Bị từ chối về Đang chờ duyệt. Bạn sẽ Duyệt/Từ chối lại từ Hàng đợi duyệt.",
    reapproved: "Đã đưa chương về hàng đợi duyệt",
  },
  report: {
    notFound: "Report not found.",
    onlyPendingCanPickUp: "Only pending reports can be picked up.",
    chooseAction: "Choose a moderation action.",
    noteRequired: "A resolution note is required for this action.",
    pickedUp: "Report moved to Reviewing",
    dismissed: "Report dismissed",
    resolved: "Report resolved",
  },
  story: {
    notFound: "Story not found.",
  },
  api: {
    unreachable: (target: string) => `Cannot reach ${target} — is the service running?`,
    requestFailed: (status: number | string) => `Request failed (HTTP ${status})`,
  },
  common: {
    reasonRequired: "A reason is required.",
  },
} as const;
