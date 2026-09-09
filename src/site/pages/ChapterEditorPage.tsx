import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { NotFoundPage } from "@/components/NotFoundPage";
import {
  getChapter,
  getMyStory,
  publishChapter,
  removeChapter,
  updateChapter,
  type ChapterStatus,
  type VolumeRef,
} from "../authorService";
import { AuthorGuard } from "../components/author/AuthorGuard";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Scheduled: "Đã lên lịch",
  Published: "Đã xuất bản",
  Removed: "Đã gỡ",
};

function EditorBody({ slug, chapterId }: { slug: string; chapterId: string }) {
  const navigate = useNavigate();
  const { busy, run } = useAsyncRunner();

  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [volumeId, setVolumeId] = useState("");
  const [status, setStatus] = useState<ChapterStatus>("Draft");
  const [volumes, setVolumes] = useState<VolumeRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getChapter(chapterId), getMyStory(slug)])
      .then(([ch, view]) => {
        if (cancelled) return;
        setTitle(ch.title);
        setContent(ch.content);
        setOrderIndex(ch.orderIndex);
        setVolumeId(ch.volumeId ?? "");
        setStatus(ch.status);
        setVolumes(view.volumes);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, chapterId]);

  if (notFound) return <NotFoundPage />;
  if (!loaded) return <p className="cb-page-intro">Đang tải chương…</p>;

  const backToStory = () => navigate(ROUTES.authorStory(slug));

  const save = () =>
    run(
      () =>
        updateChapter(chapterId, {
          title,
          content,
          orderIndex,
          volumeId: volumeId || undefined,
        }),
      "Đã lưu chương",
    );

  const doPublish = () =>
    run(
      () => publishChapter(chapterId),
      "Đã xuất bản chương",
      () => setStatus("Published"),
    );

  const doRemove = () => run(() => removeChapter(chapterId), "Đã gỡ chương", backToStory);

  return (
    <section className="cb-section">
      <div className="cb-section-head">
        <h1>Sửa chương</h1>
        <Link to={ROUTES.authorStory(slug)} className="cb-see-all">
          ← Về trang truyện
        </Link>
      </div>
      <div className="cb-detail-meta">
        <span className="cb-badge">{STATUS_LABEL[status] ?? status}</span>
      </div>

      <div className="cb-form-card" style={{ marginTop: 16 }}>
        <div className="cb-field">
          <label className="cb-field-label" htmlFor="ec-title">
            Tên chương
          </label>
          <input
            className="cb-input"
            id="ec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="cb-field">
          <label className="cb-field-label" htmlFor="ec-content">
            Nội dung
          </label>
          <textarea
            className="cb-input"
            id="ec-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ minHeight: 220 }}
          />
        </div>
        <div className="cb-field-row">
          <div className="cb-field">
            <label className="cb-field-label" htmlFor="ec-vol">
              Thuộc phần
            </label>
            <select
              className="cb-input"
              id="ec-vol"
              value={volumeId}
              onChange={(e) => setVolumeId(e.target.value)}
            >
              <option value="">— Không thuộc phần nào —</option>
              {volumes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>
          <div className="cb-field">
            <label className="cb-field-label" htmlFor="ec-order">
              Thứ tự
            </label>
            <input
              className="cb-input"
              id="ec-order"
              type="number"
              step="1"
              min="0"
              value={orderIndex}
              onChange={(e) => setOrderIndex(Number(e.target.value))}
            />
          </div>
        </div>

        <button className="cb-btn cb-block" type="button" disabled={busy} onClick={save}>
          Lưu thay đổi
        </button>

        <div className="cb-cta-actions" style={{ marginTop: 12, flexWrap: "wrap" }}>
          {status === "Draft" || status === "Scheduled" ? (
            <button type="button" className="cb-btn cb-ghost" disabled={busy} onClick={doPublish}>
              Xuất bản chương
            </button>
          ) : null}
          {status === "Published" ? (
            <button type="button" className="cb-btn cb-ghost" disabled={busy} onClick={doRemove}>
              Gỡ chương
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ChapterEditorPage() {
  const { slug = "", chapterId = "" } = useParams();
  return (
    <AuthorGuard>
      <EditorBody slug={slug} chapterId={chapterId} />
    </AuthorGuard>
  );
}
