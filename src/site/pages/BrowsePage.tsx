import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { browseStories, listGenres, type StorySort } from "../readerService";
import { StoryCard } from "../components/StoryCard";

const SORTS: { value: StorySort; label: string }[] = [
  { value: "publishedAt", label: "Mới nhất" },
  { value: "viewCount", label: "Đọc nhiều" },
  { value: "ratingAvg", label: "Đánh giá cao" },
];

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Ongoing", label: "Đang ra" },
  { value: "Completed", label: "Hoàn thành" },
  { value: "Hiatus", label: "Tạm dừng" },
];

export function BrowsePage() {
  const [searchParams] = useSearchParams();
  const [genres, setGenres] = useState<{ name: string; slug: string }[]>([]);
  const [genreSlug, setGenreSlug] = useState(() => searchParams.get("genre") ?? "");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<StorySort>("publishedAt");
  const [page, setPage] = useState(1);

  useEffect(() => {
    listGenres()
      .then(setGenres)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [genreSlug, status, sort]);

  const { data, loading } = useAsyncQuery(
    () =>
      browseStories({
        genreSlug: genreSlug || undefined,
        status: status || undefined,
        sort,
        pageNumber: page,
        pageSize: 24,
      }),
    [genreSlug, status, sort, page],
  );

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Khám phá</h1>
          <p className="cb-page-intro">Lọc theo thể loại, trạng thái và sắp xếp truyện.</p>
        </div>
        <div className="cb-inline-form">
          <select
            className="cb-input"
            value={genreSlug}
            onChange={(e) => setGenreSlug(e.target.value)}
          >
            <option value="">Tất cả thể loại</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
          <select className="cb-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="cb-input"
            value={sort}
            onChange={(e) => setSort(e.target.value as StorySort)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        {loading ? (
          <p className="cb-page-intro">Đang tải…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="cb-page-intro">Không có truyện nào khớp bộ lọc.</p>
        ) : (
          <>
            <div className="cb-featured-grid">
              {data.items.map((s) => (
                <StoryCard key={s.slug} story={s} />
              ))}
            </div>
            {data.totalPages > 1 ? (
              <div className="cb-dots" style={{ marginTop: 24 }}>
                <button
                  type="button"
                  className="cb-btn cb-ghost cb-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>
                <span className="cb-detail-meta">
                  Trang {data.pageNumber} / {data.totalPages}
                </span>
                <button
                  type="button"
                  className="cb-btn cb-ghost cb-btn-sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau →
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
