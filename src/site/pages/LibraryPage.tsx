import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import {
  listContinueReading,
  listLibrary,
  listShelfCounts,
  readingProgressMap,
  removeFromLibrary,
  setShelf,
  sortLibraryItems,
  SHELVES,
  shelfLabel,
  type LibrarySort,
  type Shelf,
} from "../libraryService";
import { useMemo, useState } from "react";

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: "added", label: "Ngày thêm" },
  { value: "updated", label: "Cập nhật gần nhất" },
  { value: "title", label: "Tên A→Z" },
  { value: "progress", label: "Tiến độ đọc" },
];

function ContinueReading() {
  const { data } = useAsyncQuery(() => listContinueReading({ pageSize: 6 }), []);
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

function CountBadge({ n }: { n: number | undefined }) {
  if (n == null) return null;
  return (
    <span className="cb-count-badge" aria-hidden>
      {n}
    </span>
  );
}

function Shelves() {
  const { busy, run } = useAsyncRunner();
  const [tab, setTab] = useState<Shelf | "all">("all");
  const [sort, setSort] = useState<LibrarySort>("added");
  const { data, loading, refetch } = useAsyncQuery(
    () => listLibrary(tab === "all" ? undefined : tab, { pageSize: 50 }),
    [tab],
  );
  const { data: counts, refetch: refetchCounts } = useAsyncQuery(() => listShelfCounts(), []);
  const { data: progress } = useAsyncQuery(
    () => (sort === "progress" ? readingProgressMap() : Promise.resolve(new Map<string, number>())),
    [sort],
  );

  const refetchAll = () => {
    refetch();
    refetchCounts();
  };

  const sortedItems = useMemo(
    () => (data ? sortLibraryItems(data.items, sort, progress ?? undefined) : []),
    [data, sort, progress],
  );

  return (
    <section className="cb-section" style={{ paddingTop: 0 }}>
      <div className="cb-segmented" style={{ maxWidth: 640 }}>
        <button
          type="button"
          aria-label="Tất cả"
          className={tab === "all" ? "is-active" : undefined}
          onClick={() => setTab("all")}
        >
          Tất cả
          <CountBadge n={counts?.all} />
        </button>
        {SHELVES.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-label={s.label}
            className={tab === s.value ? "is-active" : undefined}
            onClick={() => setTab(s.value)}
          >
            {s.label}
            <CountBadge n={counts?.[s.value]} />
          </button>
        ))}
      </div>

      <div className="cb-inline-form" style={{ marginTop: 0 }}>
        <label className="cb-field-label" htmlFor="lib-sort">
          Sắp xếp
        </label>
        <select
          id="lib-sort"
          className="cb-input"
          value={sort}
          onChange={(e) => setSort(e.target.value as LibrarySort)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="cb-page-intro">Đang tải…</p>
      ) : !data || sortedItems.length === 0 ? (
        <p className="cb-page-intro">Tủ truyện trống.</p>
      ) : (
        <ul className="cb-trend">
          {sortedItems.map((it) => (
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
                    run(
                      () => setShelf(it.storyId, e.target.value as Shelf),
                      "Đã cập nhật",
                      refetchAll,
                    )
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
                  onClick={() => run(() => removeFromLibrary(it.storyId), "Đã xoá", refetchAll)}
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
