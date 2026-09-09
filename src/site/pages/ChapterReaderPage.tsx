import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useMockQuery } from "@/hooks/useMockQuery";
import { getChapterContent, getStoryDetail } from "../readerService";
import { saveReadingProgress } from "../libraryService";
import { NotFoundPage } from "@/components/NotFoundPage";
import { ChapterComments } from "../components/chapter/ChapterComments";
import { ReportDialog } from "../components/ReportDialog";

export function ChapterReaderPage() {
  const { slug = "", order: chapterId = "" } = useParams();
  const [reporting, setReporting] = useState(false);

  const { data: story } = useMockQuery(() => getStoryDetail(slug), [slug]);
  const { data: chapter, loading } = useMockQuery(
    () => getChapterContent(slug, chapterId),
    [slug, chapterId],
  );

  const { prev, next } = useMemo(() => {
    const list = story?.chapters ?? [];
    const idx = list.findIndex((c) => c.id === chapterId);
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
    };
  }, [story, chapterId]);

  // Reading progress: save when a chapter opens (once the story id is known).
  useEffect(() => {
    if (story?.id && chapterId) {
      saveReadingProgress(story.id, chapterId).catch(() => {});
    }
  }, [story?.id, chapterId]);

  if (loading) return <p className="cb-page-intro">Đang tải chương…</p>;
  if (!chapter) return <NotFoundPage />;

  return (
    <article className="cb-reader">
      <div className="cb-reader-head">
        <Link to={ROUTES.story(slug)} className="cb-kicker">
          {story?.title ?? "Về trang truyện"}
        </Link>
        <h1>
          Chương {chapter.order}. {chapter.title}
        </h1>
        <button
          type="button"
          className="cb-btn cb-ghost cb-btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => setReporting((v) => !v)}
        >
          Báo cáo chương
        </button>
        {reporting ? (
          <ReportDialog
            targetType="Chapter"
            targetId={chapterId}
            onClose={() => setReporting(false)}
          />
        ) : null}
      </div>

      <div className="cb-reader-body" dangerouslySetInnerHTML={{ __html: chapter.html }} />

      <nav className="cb-chapter-nav" aria-label="Điều hướng chương">
        {prev ? (
          <Link to={ROUTES.chapter(slug, prev.id)} className="cb-btn cb-ghost">
            ← Chương trước
          </Link>
        ) : (
          <span />
        )}
        <Link to={ROUTES.story(slug)} className="cb-btn cb-ghost">
          Mục lục
        </Link>
        {next ? (
          <Link
            to={ROUTES.chapter(slug, next.id)}
            className="cb-btn"
            onClick={() => {
              if (story?.id) saveReadingProgress(story.id, next.id).catch(() => {});
            }}
          >
            Chương sau →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <ChapterComments chapterId={chapterId} />
    </article>
  );
}
