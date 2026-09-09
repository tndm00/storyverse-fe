import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { useMockQuery } from "@/hooks/useMockQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import {
  listContinueReading,
  listLibrary,
  removeFromLibrary,
  setShelf,
  SHELVES,
  shelfLabel,
  type Shelf,
} from "../libraryService";
import { useState } from "react";

function ContinueReading() {
  const { data } = useMockQuery(() => listContinueReading({ pageSize: 6 }), []);
  if (!data || data.length === 0) return null;
  return (
    <section className="cb-section" style={{ paddingTop: 0 }}>
      <div className="cb-section-head">
        <h2>Đang đọc dở</h2>
      </div>
      <ul className="cb-trend">
        {data.map((c) => (
          <li key={c.storyId}>
            {c.story?.slug ? (
              <Link to={ROUTES.chapter(c.story.slug, c.lastChapterId)} className="cb-trend-left">
                <span className="cb-trend-title">{c.story.title}</span>
              </Link>
            ) : (
              <span className="cb-trend-left">
                <span className="cb-trend-title">{c.story?.title ?? "Truyện"}</span>
              </span>
            )}
            <span className="cb-trend-views">
              {c.scrollPercent != null ? `${Math.round(c.scrollPercent)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Shelves() {
  const { busy, run } = useAsyncRunner();
  const [tab, setTab] = useState<Shelf | "all">("all");
  const { data, loading, refetch } = useMockQuery(
    () => listLibrary(tab === "all" ? undefined : tab, { pageSize: 50 }),
    [tab],
  );

  return (
    <section className="cb-section" style={{ paddingTop: 0 }}>
      <div className="cb-segmented" style={{ maxWidth: 520 }}>
        <button
          type="button"
          className={tab === "all" ? "is-active" : undefined}
          onClick={() => setTab("all")}
        >
          Tất cả
        </button>
        {SHELVES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={tab === s.value ? "is-active" : undefined}
            onClick={() => setTab(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="cb-page-intro">Đang tải…</p>
      ) : !data || data.items.length === 0 ? (
        <p className="cb-page-intro">Tủ truyện trống.</p>
      ) : (
        <ul className="cb-trend">
          {data.items.map((it) => (
            <li key={it.id}>
              {it.story?.slug ? (
                <Link to={ROUTES.story(it.story.slug)} className="cb-trend-left">
                  <span className="cb-trend-title">{it.story.title}</span>
                </Link>
              ) : (
                <span className="cb-trend-left">
                  <span className="cb-trend-title">
                    {it.story?.title ?? `Truyện ${it.storyId.slice(0, 8)}`}
                  </span>
                </span>
              )}
              <span className="cb-chapter-row-actions">
                <select
                  className="cb-input"
                  value={it.shelf}
                  disabled={busy}
                  onChange={(e) =>
                    run(() => setShelf(it.storyId, e.target.value as Shelf), "Đã cập nhật", refetch)
                  }
                >
                  {SHELVES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {shelfLabel(s.value)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cb-btn cb-ghost cb-btn-sm"
                  disabled={busy}
                  onClick={() => run(() => removeFromLibrary(it.storyId), "Đã xoá", refetch)}
                >
                  Xoá
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function LibraryPage() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Tủ truyện</h1>
          <p className="cb-page-intro">Đăng nhập để lưu truyện và theo dõi tiến độ đọc.</p>
        </div>
        <Link to={ROUTES.account} className="cb-btn">
          Đăng nhập
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Tủ truyện</h1>
        </div>
      </section>
      <ContinueReading />
      <Shelves />
    </>
  );
}
