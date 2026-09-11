import { lazyNamed } from "@/utils/lazyNamed";
import { RequireAuth } from "@/auth/RequireAuth";
import { ADMIN_BASE_PATH } from "@/utils/constants";
import { AdminLayout } from "./layouts/AdminLayout";

// Pages are code-split; layout + auth guard stay in the main chunk.
const DashboardPage = lazyNamed(() => import("./pages/DashboardPage"), "DashboardPage");
const ReviewQueuePage = lazyNamed(() => import("./pages/ReviewQueuePage"), "ReviewQueuePage");
const RejectedQueuePage = lazyNamed(
  () => import("./pages/RejectedQueuePage"),
  "RejectedQueuePage",
);
const ReviewDetailPage = lazyNamed(() => import("./pages/ReviewDetailPage"), "ReviewDetailPage");
const ReportsQueuePage = lazyNamed(() => import("./pages/ReportsQueuePage"), "ReportsQueuePage");
const ReportDetailPage = lazyNamed(() => import("./pages/ReportDetailPage"), "ReportDetailPage");
const CommentsPage = lazyNamed(() => import("./pages/CommentsPage"), "CommentsPage");
const StoriesPage = lazyNamed(() => import("./pages/StoriesPage"), "StoriesPage");
const GenresPage = lazyNamed(() => import("./pages/GenresPage"), "GenresPage");

// Admin console route subtree, mounted at ADMIN_BASE_PATH (an obscure,
// hard-to-guess slug — not "/admin" — so the console isn't findable by
// probing common paths). Gated by RequireAuth (moderators + platform
// admins only — see src/services/authService.js).
export const adminRoutes = {
  path: ADMIN_BASE_PATH,
  element: (
    <RequireAuth requireAdminConsole>
      <AdminLayout />
    </RequireAuth>
  ),
  children: [
    { index: true, element: <DashboardPage /> },
    { path: "review", element: <ReviewQueuePage /> },
    { path: "review/rejected", element: <RejectedQueuePage /> },
    { path: "review/:id", element: <ReviewDetailPage /> },
    { path: "reports", element: <ReportsQueuePage /> },
    { path: "reports/:id", element: <ReportDetailPage /> },
    { path: "comments", element: <CommentsPage /> },
    { path: "stories", element: <StoriesPage /> },
    { path: "genres", element: <GenresPage /> },
  ],
};
