import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import type { AuthorChapter, VolumeRef } from "../../authorService";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Scheduled: "Đã lên lịch",
  PendingReview: "Chờ duyệt",
  InReview: "Đang duyệt",
  Published: "Đã duyệt",
  Rejected: "Bị từ chối",
  Removed: "Đã gỡ",
};

// The "no volume" bucket key — matches the group whose chapters have no volumeId.
export const NO_VOLUME_KEY = "none";

// Chapters grouped by volume ("Phần"). The "no volume" bucket comes first, then
// each volume by orderIndex. Draft/Rejected rows get a "Gửi duyệt" action.
// When `onReorder` is set (story owner), each row gets ▲▼ controls that reorder
// chapters within their own group and emit the new id order for that group.
export function ChapterList({
  storySlug,
  volumes,
  chapters,
  onSubmitForReview,
  submittingId,
  onReorder,
  reorderBusy = false,
}: {
  storySlug: string;
  volumes: VolumeRef[];
  chapters: AuthorChapter[];
  onSubmitForReview: (chapterId: string) => void;
  submittingId: string | null;
  onReorder?: (groupKey: string, orderedChapterIds: string[]) => void;
  reorderBusy?: boolean;
}) {
  const groups: { key: string; title: string; items: AuthorChapter[] }[] = [
    {
      key: NO_VOLUME_KEY,
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

  const move = (groupItems: AuthorChapter[], groupKey: string, index: number, delta: number) => {
    const next = [...groupItems];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder?.(
      groupKey,
      next.map((c) => c.id),
    );
  };

  return (
    <div className="cb-chapter-groups">
      {groups.map((g) => (
        <div className="cb-chapter-group" key={g.key}>
          <h3 className="cb-chapter-group-title">{g.title}</h3>
          <ul className="cb-trend">
            {g.items.map((c, i) => (
              <li key={c.id}>
                <Link to={ROUTES.authorChapter(storySlug, c.id)} className="cb-trend-left">
                  <span className="cb-trend-rank">
                    {String(Math.round(c.orderIndex)).padStart(2, "0")}
                  </span>
                  <span className="cb-trend-title">{c.title}</span>
                </Link>
                <span className="cb-chapter-row-actions">
                  {onReorder ? (
                    <span className="cb-reorder">
                      <button
                        type="button"
                        className="cb-btn cb-ghost cb-btn-sm"
                        disabled={reorderBusy || i === 0}
                        aria-label={`Chuyển "${c.title}" lên trên`}
                        onClick={() => move(g.items, g.key, i, -1)}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="cb-btn cb-ghost cb-btn-sm"
                        disabled={reorderBusy || i === g.items.length - 1}
                        aria-label={`Chuyển "${c.title}" xuống dưới`}
                        onClick={() => move(g.items, g.key, i, 1)}
                      >
                        ▼
                      </button>
                    </span>
                  ) : null}
                  <span
                    className={`cb-badge cb-badge-${c.status.toLowerCase()}`}
                    title={c.status === "Rejected" ? (c.rejectionReason ?? undefined) : undefined}
                  >
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  {c.status === "Draft" || c.status === "Rejected" ? (
                    <button
                      type="button"
                      className="cb-btn cb-ghost cb-btn-sm"
                      disabled={submittingId === c.id}
                      onClick={() => onSubmitForReview(c.id)}
                    >
                      {submittingId === c.id
                        ? "Đang gửi…"
                        : c.status === "Rejected"
                          ? "Gửi lại duyệt"
                          : "Gửi duyệt"}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {g.items.some((c) => c.status === "Rejected" && c.rejectionReason) ? (
            <ul className="cb-page-intro" style={{ marginTop: 8 }}>
              {g.items
                .filter((c) => c.status === "Rejected" && c.rejectionReason)
                .map((c) => (
                  <li key={c.id}>
                    <strong>{c.title}</strong> bị từ chối: {c.rejectionReason}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
