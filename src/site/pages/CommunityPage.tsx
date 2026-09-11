import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { fromNowVi, truncate } from "@/utils/format";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { browseStories, type StorySort } from "../readerService";
import { listRecentComments } from "../communityService";

const vi = new Intl.NumberFormat("vi-VN");

const TABS: { value: StorySort; label: string }[] = [
  { value: "publishedAt", label: "Mới đăng" },
  { value: "viewCount", label: "Xem nhiều" },
  { value: "commentCount", label: "Nhiều bình luận" },
];

export function CommunityPage() {
  const [sort, setSort] = useState<StorySort>("publishedAt");

  const { data: page, loading: storiesLoading } = useAsyncQuery(
    () => browseStories({ sort, pageSize: 20 }),
    [sort],
  );

  const { data: recentComments, loading: commentsLoading } = useAsyncQuery(
    () => listRecentComments(15),
    [],
  );

  const stories = page?.items ?? [];
  const storyCount = page?.totalCount ?? stories.length;

  return (
    <>
      <section className="cb-section">
        <nav className="cb-breadcrumb" aria-label="Breadcrumb">
          <Link to={ROUTES.home}>Trang chủ</Link>
          <span aria-hidden="true"> / </span>
          <span>Cộng đồng kể chuyện</span>
        </nav>
        <div className="cb-hero-head">
          <h1>Cộng đồng kể chuyện</h1>
          <p className="cb-page-intro">
            Nơi người kể và người đọc cùng bàn về những câu chuyện — góp truyện, bình luận, và đặt
            câu hỏi tâm linh.
          </p>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <div className="cb-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={sort === t.value}
                className={sort === t.value ? "cb-tab is-active" : "cb-tab"}
                onClick={() => setSort(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="cb-trend-sub">{storyCount} truyện</span>
        </div>

        {storiesLoading && !page ? (
          <p className="cb-page-intro">Đang tải truyện…</p>
        ) : stories.length === 0 ? (
          <p className="cb-page-intro">Chưa có truyện nào.</p>
        ) : (
          // Switching tabs re-fetches (storiesLoading flips true) but the
          // previous page's items stay in `page` until the new ones land —
          // keep rendering them, just dimmed, instead of swapping the whole
          // list for a loading line (that unmount/remount is what caused the
          // jarring flicker/height-jump when clicking between tabs).
          <ul className="cb-trend" style={storiesLoading ? { opacity: 0.5 } : undefined}>
            {stories.map((s) => (
              <li key={s.slug}>
                <Link to={ROUTES.story(s.slug)} className="cb-trend-left">
                  <span className="cb-trend-title">{s.title}</span>
                </Link>
                <span className="cb-trend-views">
                  {sort === "viewCount"
                    ? s.reads
                    : sort === "commentCount"
                      ? `${vi.format(s.commentCount)} bình luận`
                      : fromNowVi(s.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Truyện ma mới bình luận</h2>
        </div>

        {commentsLoading ? (
          <p className="cb-page-intro">Đang tải bình luận…</p>
        ) : !recentComments || recentComments.length === 0 ? (
          <p className="cb-page-intro">Chưa có bình luận nào gần đây.</p>
        ) : (
          <ul className="cb-comment-list">
            {recentComments.map((c) => (
              <li key={c.commentId} className="cb-comment">
                <div className="cb-comment-head">
                  <span className="cb-comment-author">
                    {c.storySlug && c.storyTitle ? (
                      <Link to={ROUTES.story(c.storySlug)}>{c.storyTitle}</Link>
                    ) : (
                      (c.storyTitle ?? "Truyện đã bị xoá")
                    )}
                  </span>
                  <span className="cb-comment-time">{fromNowVi(c.createdAt)}</span>
                </div>
                <div className="cb-comment-body">
                  <strong>{c.authorLabel}</strong>: {truncate(c.content, 140)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
