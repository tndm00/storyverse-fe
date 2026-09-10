import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { NotFoundPage } from "@/components/NotFoundPage";
import {
  addChapter,
  addVolume,
  buildGenreSelection,
  getMyStory,
  listGenres,
  setGenres,
  submitChapterForReview,
  setStoryStatus,
  updateVolume,
  STORY_STATUS_TRANSITIONS,
  type StoryStatus,
  type VolumeRef,
} from "../authorService";
import { AuthorGuard } from "../components/author/AuthorGuard";
import { ChapterList } from "../components/author/ChapterList";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Ongoing: "Đang ra",
  Completed: "Hoàn thành",
  Hiatus: "Tạm dừng",
  Dropped: "Đã bỏ",
};

function VolumeRow({ volume, onSaved }: { volume: VolumeRef; onSaved: () => void }) {
  const { busy, run } = useAsyncRunner();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(volume.title);

  if (!editing) {
    return (
      <li>
        <span className="cb-trend-left">
          <span className="cb-trend-rank">{String(volume.orderIndex).padStart(2, "0")}</span>
          <span className="cb-trend-title">{volume.title}</span>
        </span>
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
  const [secondary, setSecondary] = useState<string[]>(
    () => current.filter((g) => !g.isPrimary).map((g) => g.slug),
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
          Thể loại chính
        </label>
        <select
          className="cb-input"
          id="ge-primary"
          value={primary}
          onChange={(e) => {
            setPrimary(e.target.value);
            setSecondary((prev) => prev.filter((s) => s !== e.target.value));
          }}
        >
          {list.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      <div className="cb-field">
        <label className="cb-field-label" htmlFor="ge-secondary">
          Thể loại phụ
        </label>
        <select
          className="cb-input"
          id="ge-secondary"
          multiple
          size={Math.min(6, Math.max(3, list.length))}
          value={secondary}
          onChange={(e) =>
            setSecondary(
              Array.from(e.target.selectedOptions, (o) => o.value).filter((v) => v !== primary),
            )
          }
        >
          {list
            .filter((g) => g.slug !== primary)
            .map((g) => (
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
              () => setGenres(storyId, buildGenreSelection(primary, secondary)),
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

  const [nextStatus, setNextStatus] = useState<StoryStatus | "">("");
  const [volTitle, setVolTitle] = useState("");
  const [chTitle, setChTitle] = useState("");
  const [chContent, setChContent] = useState("");
  const [chVolume, setChVolume] = useState("");
  const [chPublish, setChPublish] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  if (loading) return <p className="cb-page-intro">Đang tải…</p>;
  if (error || !data) return <NotFoundPage />;

  const { story, volumes, chapters } = data;
  const transitions = STORY_STATUS_TRANSITIONS[story.status] ?? [];

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
          {[...story.genres]
            .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
            .map((g) => (
              <span
                className={g.isPrimary ? "cb-chip is-primary" : "cb-chip"}
                key={g.slug}
                title={g.isPrimary ? "Thể loại chính" : "Thể loại phụ"}
              >
                {g.isPrimary ? "★ " : ""}
                {g.name}
              </span>
            ))}
        </div>
        <GenreEditor storyId={story.publicId} current={story.genres} onSaved={refetch} />

        {story.status === "Draft" ? (
          <p className="cb-page-intro">
            Truyện đang là nháp và chưa hiển thị công khai. Gửi duyệt chương đầu tiên — truyện sẽ
            hiển thị công khai ngay sau khi được kiểm duyệt.
          </p>
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
            {volumes.map((v) => (
              <VolumeRow key={v.id} volume={v} onSaved={refetch} />
            ))}
          </ul>
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
        />

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
