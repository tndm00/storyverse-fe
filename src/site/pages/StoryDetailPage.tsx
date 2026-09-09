import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useMockQuery } from "@/hooks/useMockQuery";
import { getStoryDetail } from "../readerService";
import { NotFoundPage } from "@/components/NotFoundPage";
import { StoryEngagementBar } from "../components/story/StoryEngagementBar";
import { AddToLibraryButton } from "../components/story/AddToLibraryButton";
import { ReportDialog } from "../components/ReportDialog";

export function StoryDetailPage() {
  const { slug = "" } = useParams();
  const { data, loading } = useMockQuery(() => getStoryDetail(slug), [slug]);
  const [reporting, setReporting] = useState(false);

  if (loading) return <p className="cb-page-intro">Đang tải…</p>;
  if (!data) return <NotFoundPage />;

  const firstChapter = data.chapters[0];

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <div className="cb-kicker">{data.kicker}</div>
          <h1>{data.title}</h1>
          {data.description ? <p className="cb-page-intro">{data.description}</p> : null}
          <div className="cb-detail-meta">
            <span>{data.reads}</span>
            <span>·</span>
            <span>{data.ratingLabel}</span>
            <span>·</span>
            <span>{data.chapters.length} chương</span>
            {data.guestAuthorName ? (
              <>
                <span>·</span>
                <span>bởi {data.guestAuthorName}</span>
              </>
            ) : data.authorProfileId && data.authorProfileId > 0 ? (
              <>
                <span>·</span>
                <Link to={ROUTES.author(data.authorProfileId)}>Trang tác giả</Link>
              </>
            ) : null}
          </div>
          {data.genres.length > 0 ? (
            <div className="cb-chips">
              {data.genres.map((g) => (
                <span className="cb-chip" key={g}>
                  {g}
                </span>
              ))}
            </div>
          ) : null}
          <div className="cb-cta-actions" style={{ marginTop: 16, flexWrap: "wrap" }}>
            {firstChapter ? (
              <Link to={ROUTES.chapter(data.slug, firstChapter.id)} className="cb-btn">
                Đọc từ đầu
              </Link>
            ) : null}
            <AddToLibraryButton storyId={data.id} />
            <button
              type="button"
              className="cb-btn cb-ghost cb-btn-sm"
              onClick={() => setReporting((v) => !v)}
            >
              Báo cáo truyện
            </button>
          </div>
          {reporting ? (
            <ReportDialog
              targetType="Story"
              targetId={data.id}
              onClose={() => setReporting(false)}
            />
          ) : null}
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Tương tác</h2>
        </div>
        <StoryEngagementBar storyId={data.id} ratingLabel={data.ratingLabel} />
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Danh sách chương</h2>
        </div>
        {data.chapters.length === 0 ? (
          <p className="cb-page-intro">Truyện chưa có chương nào được đăng.</p>
        ) : (
          <ul className="cb-trend">
            {data.chapters.map((c) => (
              <li key={c.id}>
                <Link to={ROUTES.chapter(data.slug, c.id)} className="cb-trend-left">
                  <span className="cb-trend-rank">{String(c.order).padStart(2, "0")}</span>
                  <span className="cb-trend-title">{c.title}</span>
                </Link>
                <span className="cb-trend-views">{c.wordCount.toLocaleString("vi-VN")} chữ</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
