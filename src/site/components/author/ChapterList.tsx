import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import type { AuthorChapter, VolumeRef } from "../../authorService";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Scheduled: "Đã lên lịch",
  Published: "Đã xuất bản",
  Removed: "Đã gỡ",
};

// Chapters grouped by volume ("Phần"). The "no volume" bucket comes first, then
// each volume by orderIndex. Each row links to the chapter editor; Draft rows get
// a "Xuất bản" action.
export function ChapterList({
  storySlug,
  volumes,
  chapters,
  onPublish,
  publishingId,
}: {
  storySlug: string;
  volumes: VolumeRef[];
  chapters: AuthorChapter[];
  onPublish: (chapterId: string) => void;
  publishingId: string | null;
}) {
  const groups: { key: string; title: string; items: AuthorChapter[] }[] = [
    {
      key: "none",
      title: "Không thuộc phần nào",
      items: chapters.filter((c) => !c.volumeId),
    },
    ...volumes.map((v) => ({
      key: v.id,
      title: v.title,
      items: chapters.filter((c) => c.volumeId === v.id),
    })),
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <p className="cb-page-intro">Truyện chưa có chương nào.</p>;
  }

  return (
    <div className="cb-chapter-groups">
      {groups.map((g) => (
        <div className="cb-chapter-group" key={g.key}>
          <h3 className="cb-chapter-group-title">{g.title}</h3>
          <ul className="cb-trend">
            {g.items.map((c) => (
              <li key={c.id}>
                <Link to={ROUTES.authorChapter(storySlug, c.id)} className="cb-trend-left">
                  <span className="cb-trend-rank">
                    {String(Math.round(c.orderIndex)).padStart(2, "0")}
                  </span>
                  <span className="cb-trend-title">{c.title}</span>
                </Link>
                <span className="cb-chapter-row-actions">
                  <span className={`cb-badge cb-badge-${c.status.toLowerCase()}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  {c.status === "Draft" ? (
                    <button
                      type="button"
                      className="cb-btn cb-ghost cb-btn-sm"
                      disabled={publishingId === c.id}
                      onClick={() => onPublish(c.id)}
                    >
                      {publishingId === c.id ? "Đang xuất bản…" : "Xuất bản"}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
