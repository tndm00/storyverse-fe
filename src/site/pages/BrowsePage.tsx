import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { browseStories, listGenres, type StorySort } from "../readerService";
import { StoryListRow } from "../components/StoryListRow";

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

const COPY: Record<"long" | "short", { title: string; intro: string; metaDescription: string }> = {
  long: {
    title: "Truyện Ma Hay",
    intro: "Truyện dài nhiều chương — lọc theo thể loại, trạng thái và sắp xếp.",
    metaDescription:
      "Truyện ma dài nhiều chương, đọc dài kỳ — lọc theo thể loại, trạng thái và sắp xếp mới nhất, đọc nhiều, đánh giá cao.",
  },
  short: {
    title: "Truyện Ma Có Thật",
    intro: "Truyện ngắn trọn vẹn 1 chương — lọc theo thể loại, trạng thái và sắp xếp.",
    metaDescription:
      "Truyện ma có thật trọn vẹn 1 chương — lọc theo thể loại, trạng thái và sắp xếp mới nhất, đọc nhiều, đánh giá cao.",
  },
};

export function BrowsePage({ lengthMode }: { lengthMode: "long" | "short" }) {
  const [searchParams] = useSearchParams();
  const [genres, setGenres] = useState<{ name: string; slug: string }[]>([]);
  const [genreSlug, setGenreSlug] = useState(() => searchParams.get("genre") ?? "");
  const [status, setStatus] = useState("");
  const [keywordInput, setKeywordInput] = useState(() => searchParams.get("q") ?? "");
  const [keyword, setKeyword] = useState(() => searchParams.get("q") ?? "");
  const [sort, setSort] = useState<StorySort>(() => {
    const fromUrl = searchParams.get("sort");
    return fromUrl === "viewCount" || fromUrl === "ratingAvg" || fromUrl === "publishedAt"
      ? fromUrl
      : "publishedAt";
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    listGenres()
      .then(setGenres)
      .catch(() => {});
  }, []);

  // Re-syncs filters from the URL when it changes without remounting this
  // component — e.g. the header search box calls navigate() to this same
  // route with a new ?q=, which React Router treats as a re-render, not a
  // fresh mount, so the lazy useState initializers above never see it.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const genre = searchParams.get("genre") ?? "";
    const fromUrl = searchParams.get("sort");
    setKeyword(q);
    setKeywordInput(q);
    setGenreSlug(genre);
    setSort(
      fromUrl === "viewCount" || fromUrl === "ratingAvg" || fromUrl === "publishedAt"
        ? fromUrl
        : "publishedAt",
    );
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [genreSlug, status, sort, keyword]);

  const { data, loading } = useAsyncQuery(
    () =>
      browseStories({
        genreSlug: genreSlug || undefined,
        status: status || undefined,
        length: lengthMode,
        keyword: keyword || undefined,
        sort,
        pageNumber: page,
        pageSize: 20,
      }),
    [genreSlug, status, sort, page, lengthMode, keyword],
  );

  const copy = COPY[lengthMode];
  useDocumentMeta(copy.title, copy.metaDescription);

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>{copy.title}</h1>
          <p className="cb-page-intro">
            {keyword ? `Kết quả tìm kiếm cho “${keyword}”` : copy.intro}
          </p>
        </div>
        <form
          className="cb-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            setKeyword(keywordInput.trim());
          }}
        >
          <input
            type="search"
            className="cb-input"
            aria-label="Tìm theo tên truyện"
            placeholder="Tìm theo tên truyện…"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
          <select
            className="cb-input"
            aria-label="Lọc theo thể loại"
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
          <select
            className="cb-input"
            aria-label="Lọc theo trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="cb-input"
            aria-label="Sắp xếp"
            value={sort}
            onChange={(e) => setSort(e.target.value as StorySort)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </form>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        {loading ? (
          <p className="cb-page-intro">Đang tải…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="cb-page-intro">Không có truyện nào khớp bộ lọc.</p>
        ) : (
          <>
            <ul className="cb-trend">
              {data.items.map((s) => (
                <StoryListRow key={s.slug} story={s} />
              ))}
            </ul>
            {data.totalPages > 1 ? (
              <div className="cb-pagination" style={{ marginTop: 24 }}>
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
