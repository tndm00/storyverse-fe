import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { getChapterContent, getStoryDetail } from "../readerService";
import { getReadingProgress, saveReadingProgress } from "../libraryService";
import { NotFoundPage } from "@/components/NotFoundPage";
import { ChapterComments } from "../components/chapter/ChapterComments";
import { ReportDialog } from "../components/ReportDialog";
import { ReadingSettingsPanel } from "../reader/ReadingSettingsPanel";
import { FONT_SIZES, LINE_HEIGHTS, WIDTHS, useReadingSettings } from "../reader/readingSettings";
import { useAuth } from "@/hooks/useAuth";

export function ChapterReaderPage() {
  const { slug = "", order: chapterId = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const [reporting, setReporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resumeChapterId, setResumeChapterId] = useState<string | null>(null);
  const { settings, update, reset } = useReadingSettings();

  const { data: story } = useAsyncQuery(() => getStoryDetail(slug), [slug]);
  const { data: chapter, loading } = useAsyncQuery(
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

  // Reading progress: check for a saved position in a *different* chapter of
  // this story, once per story/chapter view — surfaced as a dismissable banner
  // rather than a silent redirect. 404 (never read before) is ignored.
  useEffect(() => {
    setResumeChapterId(null);
    if (!isAuthenticated || !story?.id) return;
    let cancelled = false;
    getReadingProgress(story.id)
      .then((progress) => {
        if (cancelled || !progress) return;
        if (progress.lastChapterId && progress.lastChapterId !== chapterId) {
          setResumeChapterId(progress.lastChapterId);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, story?.id, chapterId]);

  const resumeChapter = useMemo(
    () => story?.chapters.find((c) => c.id === resumeChapterId) ?? null,
    [story, resumeChapterId],
  );

  if (loading) return <p className="cb-page-intro">Đang tải chương…</p>;
  if (!chapter) return <NotFoundPage />;

  const readerStyle = {
    maxWidth: WIDTHS[settings.width],
    "--reader-font-size": `${FONT_SIZES[settings.fontSize]}px`,
    "--reader-line-height": String(LINE_HEIGHTS[settings.lineHeight]),
  } as CSSProperties;

  return (
    <article className="cb-reader" data-reader-theme={settings.theme} style={readerStyle}>
      <div className="cb-reader-head">
        <Link to={ROUTES.story(slug)} className="cb-kicker">
          {story?.title ?? "Về trang truyện"}
        </Link>
        <h1>
          Chương {chapter.order}. {chapter.title}
        </h1>
        <div className="cb-reader-head-actions">
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((v) => !v)}
          >
            Cài đặt đọc
          </button>
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            onClick={() => setReporting((v) => !v)}
          >
            Báo cáo chương
          </button>
        </div>
        {showSettings ? (
          <ReadingSettingsPanel
            settings={settings}
            update={update}
            reset={reset}
            onClose={() => setShowSettings(false)}
          />
        ) : null}
        {reporting ? (
          <ReportDialog
            targetType="Chapter"
            targetId={chapterId}
            onClose={() => setReporting(false)}
          />
        ) : null}
      </div>

      {resumeChapter ? (
        <div className="cb-alert cb-alert-info" style={{ marginBottom: 16 }}>
          <span>
            Bạn đang đọc dở Chương {resumeChapter.order}. {resumeChapter.title}
          </span>
          <Link
            to={ROUTES.chapter(slug, resumeChapter.id)}
            className="cb-btn cb-btn-sm"
            onClick={() => setResumeChapterId(null)}
          >
            Tiếp tục đọc
          </Link>
        </div>
      ) : null}

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
