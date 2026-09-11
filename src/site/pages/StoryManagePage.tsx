import { useEffect, useState } from "react";
import { App } from "antd";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { NotFoundPage } from "@/components/NotFoundPage";
import {
  addChapter,
  addVolume,
  buildGenreSelection,
  deleteStory,
  forgetStory,
  getMyStory,
  listGenres,
  reorderStoryChapters,
  reorderVolumeChapters,
  reorderVolumes,
  setGenres,
  submitChapterForReview,
  setStoryStatus,
  updateVolume,
  STORY_STATUS_TRANSITIONS,
  type AuthorChapter,
  type StoryStatus,
  type VolumeRef,
} from "../authorService";
import { AuthorGuard } from "../components/author/AuthorGuard";
import { ChapterList, NO_VOLUME_KEY } from "../components/author/ChapterList";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Ongoing: "Đang ra",
  Completed: "Hoàn thành",
  Hiatus: "Tạm dừng",
  Dropped: "Đã bỏ",
};

function VolumeRow({
  volume,
  displayIndex,
  onSaved,
  reorder,
}: {
  volume: VolumeRef;
  displayIndex: number;
  onSaved: () => void;
  reorder?: { isFirst: boolean; isLast: boolean; busy: boolean; move: (delta: number) => void };
}) {
  const { busy, run } = useAsyncRunner();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(volume.title);

  if (!editing) {
    return (
      <li>
        <span className="cb-trend-left">
          <span className="cb-trend-rank">{String(displayIndex + 1).padStart(2, "0")}</span>
          <span className="cb-trend-title">{volume.title}</span>
        </span>
        <span className="cb-chapter-row-actions">
          {reorder ? (
            <span className="cb-reorder">
              <button
                type="button"
                className="cb-btn cb-ghost cb-btn-sm"
                disabled={reorder.busy || reorder.isFirst}
                aria-label={`Chuyển phần "${volume.title}" lên trên`}
                onClick={() => reorder.move(-1)}
              >
                ▲
              </button>
              <button
                type="button"
                className="cb-btn cb-ghost cb-btn-sm"
                disabled={reorder.busy || reorder.isLast}
                aria-label={`Chuyển phần "${volume.title}" xuống dưới`}
                onClick={() => reorder.move(1)}
              >
                ▼
              </button>
            </span>
          ) : null}
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            onClick={() => {
              setTitle(volume.title);
              setEditing(true);
            }}
          >
            Sửa tên phần
          </button>
        </span>
      </li>
    );
  }

  return (
    <li>
      <div className="cb-inline-form" style={{ flex: 1 }}>
        <input className="cb-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button
          type="button"
          className="cb-btn cb-btn-sm"
          disabled={busy || !title.trim()}
          onClick={() =>
            run(
              () => updateVolume(volume.id, { title, orderIndex: volume.orderIndex }),
              "Đã đổi tên phần",
              () => {
                setEditing(false);
                onSaved();
              },
            )
          }
        >
          Lưu
        </button>
        <button
          type="button"
          className="cb-btn cb-ghost cb-btn-sm"
          disabled={busy}
          onClick={() => setEditing(false)}
        >
          Huỷ
        </button>
      </div>
    </li>
  );
}

function GenreEditor({
  storyId,
  current,
  onSaved,
}: {
  storyId: string;
  current: { name: string; slug: string; isPrimary: boolean }[];
  onSaved: () => void;
}) {
  const { data: options } = useAsyncQuery(() => listGenres(), []);
  const { busy, run } = useAsyncRunner();
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState(
    () => current.find((g) => g.isPrimary)?.slug ?? current[0]?.slug ?? "",
  );

  if (!open) {
    return (
      <button
        type="button"
        className="cb-btn cb-ghost cb-btn-sm"
        onClick={() => setOpen(true)}
        style={{ marginTop: 8 }}
      >
        Sửa thể loại
      </button>
    );
  }

  const list = options ?? [];
  return (
    <div className="cb-form-card" style={{ marginTop: 12 }}>
      <div className="cb-field">
        <label className="cb-field-label" htmlFor="ge-primary">
          Thể loại
        </label>
        <select
          className="cb-input"
          id="ge-primary"
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
        >
          {list.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="cb-cta-actions">
        <button
          type="button"
          className="cb-btn cb-ghost cb-btn-sm"
          disabled={busy}
          onClick={() => setOpen(false)}
        >
          Huỷ
        </button>
        <button
          type="button"
          className="cb-btn cb-btn-sm"
          disabled={busy || !primary}
          onClick={() =>
            run(
              () => setGenres(storyId, buildGenreSelection(primary, [])),
              "Đã cập nhật thể loại",
              () => {
                setOpen(false);
                onSaved();
              },
            )
          }
        >
          Lưu thể loại
        </button>
      </div>
    </div>
  );
}

function ManageBody({ slug }: { slug: string }) {
  const { data, loading, error, refetch } = useAsyncQuery(() => getMyStory(slug), [slug]);
  const { busy, run } = useAsyncRunner();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const [nextStatus, setNextStatus] = useState<StoryStatus | "">("");
  const [volTitle, setVolTitle] = useState("");
  const [chTitle, setChTitle] = useState("");
  const [chContent, setChContent] = useState("");
  const [chVolume, setChVolume] = useState("");
  const [chPublish, setChPublish] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Local copies so ▲▼ reorder can update optimistically and revert on failure.
  const [volumes, setVolumes] = useState<VolumeRef[]>([]);
  const [chapters, setChapters] = useState<AuthorChapter[]>([]);
  const [reorderBusy, setReorderBusy] = useState(false);
  useEffect(() => {
    if (data) {
      setVolumes(data.volumes);
      setChapters(data.chapters);
    }
  }, [data]);

  if (loading) return <p className="cb-page-intro">Đang tải…</p>;
  if (error || !data) return <NotFoundPage />;

  const { story, isOwner } = data;
  const transitions = STORY_STATUS_TRANSITIONS[story.status] ?? [];

  const moveVolume = async (index: number, delta: number) => {
    const next = [...volumes];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const prev = volumes;
    setVolumes(next);
    setReorderBusy(true);
    try {
      setVolumes(await reorderVolumes(story.publicId, next.map((v) => v.id)));
      message.success("Đã lưu thứ tự phần");
    } catch (e) {
      setVolumes(prev);
      message.error(e instanceof Error ? e.message : "Không lưu được thứ tự phần");
    } finally {
      setReorderBusy(false);
    }
  };

  const handleChapterReorder = async (groupKey: string, orderedIds: string[]) => {
    const inGroup = (c: AuthorChapter) =>
      groupKey === NO_VOLUME_KEY ? !c.volumeId : c.volumeId === groupKey;
    const byId = new Map(chapters.map((c) => [c.id, c]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter((c): c is AuthorChapter => !!c);
    let k = 0;
    const next = chapters.map((c) => (inGroup(c) ? reordered[k++] : c));
    const prev = chapters;
    setChapters(next);
    setReorderBusy(true);
    try {
      if (groupKey === NO_VOLUME_KEY) await reorderStoryChapters(story.publicId, orderedIds);
      else await reorderVolumeChapters(groupKey, orderedIds);
      message.success("Đã lưu thứ tự chương");
      refetch();
    } catch (e) {
      setChapters(prev);
      message.error(e instanceof Error ? e.message : "Không lưu được thứ tự chương");
    } finally {
      setReorderBusy(false);
    }
  };

  const doStatus = () => {
    if (!nextStatus) return;
    run(
      () => setStoryStatus(story.publicId, nextStatus),
      "Đã cập nhật trạng thái",
      () => {
        setNextStatus("");
        refetch();
      },
    );
  };

  const doAddVolume = () => {
    if (!volTitle.trim()) return;
    run(
      () => addVolume(story.publicId, { title: volTitle }),
      "Đã thêm phần",
      () => {
        setVolTitle("");
        refetch();
      },
    );
  };

  const doAddChapter = () => {
    if (!chTitle.trim() || !chContent.trim()) return;
    run(
      () =>
        addChapter(story.publicId, {
          title: chTitle,
          content: chContent,
          volumeId: chVolume || undefined,
          publishImmediately: chPublish,
        }),
      chPublish ? "Đã gửi chương để duyệt" : "Đã lưu chương nháp",
      () => {
        setChTitle("");
        setChContent("");
        setChVolume("");
        refetch();
      },
    );
  };

  const doDelete = () => {
    modal.confirm({
      title: "Xoá truyện?",
      content: `Xoá vĩnh viễn truyện "${story.title}", không thể hoàn tác. Toàn bộ phần và chương của truyện sẽ mất theo.`,
      okText: "Xoá vĩnh viễn",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: async () => {
        setDeleting(true);
        try {
          await deleteStory(story.publicId);
          forgetStory(story.slug);
          message.success("Đã xoá truyện");
          navigate(ROUTES.authorStudio);
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Không xoá được truyện");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const doSubmitForReview = (chapterId: string) => {
    setPublishingId(chapterId);
    run(
      () => submitChapterForReview(chapterId),
      "Đã gửi duyệt",
      () => {
        setPublishingId(null);
        refetch();
      },
    ).finally(() => setPublishingId(null));
  };

  return (
    <>
      <section className="cb-section">
        <div className="cb-section-head">
          <h1>{story.title}</h1>
          <Link to={ROUTES.story(story.slug)} className="cb-see-all">
            Xem trang truyện
          </Link>
        </div>
        <div className="cb-detail-meta">
          <span className="cb-badge">{STATUS_LABEL[story.status] ?? story.status}</span>
          {story.genres.map((g) => (
            <span className="cb-chip" key={g.slug}>
              {g.name}
            </span>
          ))}
        </div>
        <GenreEditor storyId={story.publicId} current={story.genres} onSaved={refetch} />

        {story.status === "Draft" ? (
          <>
            <p className="cb-page-intro">
              Truyện đang là nháp và chưa hiển thị công khai. Gửi duyệt chương đầu tiên — truyện sẽ
              hiển thị công khai ngay sau khi được kiểm duyệt.
            </p>
            <button
              type="button"
              className="cb-btn cb-btn-danger cb-btn-sm"
              style={{ marginTop: 8 }}
              disabled={deleting}
              onClick={doDelete}
            >
              Xoá truyện
            </button>
          </>
        ) : transitions.length > 0 ? (
          <div className="cb-inline-form">
            <select
              className="cb-input"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as StoryStatus | "")}
            >
              <option value="">— Đổi trạng thái —</option>
              {transitions.map((t) => (
                <option key={t} value={t}>
                  {STATUS_LABEL[t] ?? t}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="cb-btn cb-btn-sm"
              disabled={busy || !nextStatus}
              onClick={doStatus}
            >
              Cập nhật
            </button>
          </div>
        ) : null}
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Phần</h2>
        </div>
        <p className="cb-page-intro">
          Phần là cách nhóm nhiều chương (ví dụ: Phần 1 — Khởi đầu). Truyện ngắn có thể bỏ qua.
        </p>
        {volumes.length > 0 ? (
          <ul className="cb-trend">
            {volumes.map((v, i) => (
              <VolumeRow
                key={v.id}
                volume={v}
                displayIndex={i}
                onSaved={refetch}
                reorder={
                  isOwner && volumes.length > 1
                    ? {
                        isFirst: i === 0,
                        isLast: i === volumes.length - 1,
                        busy: reorderBusy,
                        move: (delta) => moveVolume(i, delta),
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        ) : null}
        {isOwner && volumes.length > 1 ? (
          <p className="cb-page-intro" style={{ marginTop: 6, fontSize: 12 }}>
            Dùng ▲▼ để đổi thứ tự phần.
          </p>
        ) : null}
        <div className="cb-inline-form">
          <input
            className="cb-input"
            value={volTitle}
            onChange={(e) => setVolTitle(e.target.value)}
            placeholder="Tên phần mới"
          />
          <button
            type="button"
            className="cb-btn cb-btn-sm"
            disabled={busy || !volTitle.trim()}
            onClick={doAddVolume}
          >
            ＋ Thêm phần
          </button>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Chương</h2>
        </div>
        <ChapterList
          storySlug={story.slug}
          volumes={volumes}
          chapters={chapters}
          onSubmitForReview={doSubmitForReview}
          submittingId={publishingId}
          onReorder={isOwner ? handleChapterReorder : undefined}
          reorderBusy={reorderBusy}
        />
        {isOwner ? (
          <p className="cb-page-intro" style={{ marginTop: 6, fontSize: 12 }}>
            Dùng ▲▼ để đổi thứ tự chương trong cùng một phần.
          </p>
        ) : null}

        <div className="cb-form-card" style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Thêm chương</h3>
          <div className="cb-field">
            <label className="cb-field-label" htmlFor="nc-title">
              Tên chương
            </label>
            <input
              className="cb-input"
              id="nc-title"
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
            />
          </div>
          <div className="cb-field">
            <label className="cb-field-label" htmlFor="nc-content">
              Nội dung
            </label>
            <textarea
              className="cb-input"
              id="nc-content"
              value={chContent}
              onChange={(e) => setChContent(e.target.value)}
              style={{ minHeight: 140 }}
            />
          </div>
          <div className="cb-field-row">
            <div className="cb-field">
              <label className="cb-field-label" htmlFor="nc-vol">
                Thuộc phần
              </label>
              <select
                className="cb-input"
                id="nc-vol"
                value={chVolume}
                onChange={(e) => setChVolume(e.target.value)}
              >
                <option value="">— Không thuộc phần nào —</option>
                {volumes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="cb-field cb-checkbox-row" style={{ alignItems: "center" }}>
              <input
                type="checkbox"
                id="nc-pub"
                checked={chPublish}
                onChange={(e) => setChPublish(e.target.checked)}
              />
              <label htmlFor="nc-pub">Gửi duyệt ngay</label>
            </div>
          </div>
          <button
            type="button"
            className="cb-btn cb-block"
            disabled={busy || !chTitle.trim() || !chContent.trim()}
            onClick={doAddChapter}
          >
            ＋ Thêm chương
          </button>
        </div>
      </section>
    </>
  );
}

export function StoryManagePage() {
  const { slug = "" } = useParams();
  return (
    <AuthorGuard>
      <ManageBody slug={slug} />
    </AuthorGuard>
  );
}
