import type { ReactNode } from "react";
import { lazyNamed } from "@/utils/lazyNamed";
import { RequireAuth } from "@/auth/RequireAuth";
import { ROUTES } from "@/utils/constants";
import { SiteLayout } from "./layouts/SiteLayout";

// Pages are code-split; the layout stays in the main chunk.
const HomePage = lazyNamed(() => import("./pages/HomePage"), "HomePage");
const FeaturedPage = lazyNamed(() => import("./pages/FeaturedPage"), "FeaturedPage");
const TopicsPage = lazyNamed(() => import("./pages/TopicsPage"), "TopicsPage");
const CommunityPage = lazyNamed(() => import("./pages/CommunityPage"), "CommunityPage");
const SubmitPage = lazyNamed(() => import("./pages/SubmitPage"), "SubmitPage");
const BrowsePage = lazyNamed(() => import("./pages/BrowsePage"), "BrowsePage");
const StoryDetailPage = lazyNamed(() => import("./pages/StoryDetailPage"), "StoryDetailPage");
const ChapterReaderPage = lazyNamed(() => import("./pages/ChapterReaderPage"), "ChapterReaderPage");
const LibraryPage = lazyNamed(() => import("./pages/LibraryPage"), "LibraryPage");
const AuthorProfilePage = lazyNamed(() => import("./pages/AuthorProfilePage"), "AuthorProfilePage");
const AccountPage = lazyNamed(() => import("./pages/AccountPage"), "AccountPage");
const BecomeAuthorPage = lazyNamed(() => import("./pages/BecomeAuthorPage"), "BecomeAuthorPage");
const AuthorStudioPage = lazyNamed(() => import("./pages/AuthorStudioPage"), "AuthorStudioPage");
const StoryManagePage = lazyNamed(() => import("./pages/StoryManagePage"), "StoryManagePage");
const ChapterEditorPage = lazyNamed(() => import("./pages/ChapterEditorPage"), "ChapterEditorPage");

// Reader-site author routes need a session but not an admin role; an
// unauthenticated visitor is sent to the Canh Ba account page.
const authed = (element: ReactNode) => (
  <RequireAuth loginPath={ROUTES.account}>{element}</RequireAuth>
);

// Public reader-site route subtree, mounted at "/". No auth gate on the reader pages.
export const siteRoutes = {
  element: <SiteLayout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: "featured", element: <FeaturedPage /> },
    { path: "topics", element: <TopicsPage /> },
    { path: "community", element: <CommunityPage /> },
    { path: "submit", element: <SubmitPage /> },
    { path: "browse", element: <BrowsePage /> },
    { path: "story/:slug", element: <StoryDetailPage /> },
    { path: "story/:slug/chapter/:order", element: <ChapterReaderPage /> },
    { path: "library", element: <LibraryPage /> },
    { path: "author/:id", element: <AuthorProfilePage /> },

    // account + author workspace
    { path: "tai-khoan", element: <AccountPage /> },
    { path: "tac-gia", element: authed(<AuthorStudioPage />) },
    { path: "tac-gia/dang-ky", element: authed(<BecomeAuthorPage />) },
    { path: "tac-gia/dang-truyen", element: authed(<SubmitPage />) },
    { path: "tac-gia/truyen/:slug", element: authed(<StoryManagePage />) },
    { path: "tac-gia/truyen/:slug/chuong/:chapterId", element: authed(<ChapterEditorPage />) },
  ],
};
