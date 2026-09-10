import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { listGenres, listStories, type GenreOption } from "../readerService";

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 7v5l9 9 5-5-9-9H3Z" />
      <circle cx="7" cy="11" r="1.5" />
    </svg>
  );
}

export function TopicsPage() {
  const [genres, setGenres] = useState<GenreOption[] | null>(null);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    listGenres()
      .then((rows) => {
        setGenres(rows);
        if (rows.length) setActive(rows[0].slug);
      })
      .catch(() => setGenres([]));
  }, []);

  const { data: stories } = useAsyncQuery(
    () => (active ? listStories({ genreSlug: active, pageSize: 20 }) : Promise.resolve([])),
    [active],
  );

  const activeGenre = genres?.find((g) => g.slug === active);

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Theo chủ đề</h1>
          <p className="cb-page-intro">Chọn một thể loại để xem những câu chuyện cùng loại.</p>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        {genres === null ? (
          <p className="cb-page-intro">Đang tải thể loại…</p>
        ) : genres.length === 0 ? (
          <p className="cb-page-intro">Chưa có thể loại nào.</p>
        ) : (
          <div className="cb-topic-grid">
            {genres.map((g) => (
              <button
                key={g.slug}
                type="button"
                className={`cb-topic-tile${g.slug === active ? " is-active" : ""}`}
                aria-pressed={g.slug === active}
                onClick={() => setActive(g.slug)}
              >
                <TagIcon />
                <div className="cb-topic-name">{g.name}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {activeGenre ? (
        <section className="cb-section" style={{ paddingTop: 0 }}>
          <div className="cb-section-head">
            <h2>Truyện thể loại: {activeGenre.name}</h2>
          </div>
          <ul className="cb-trend">
            {(stories ?? []).map((s, i) => (
              <li key={s.slug}>
                <Link to={ROUTES.story(s.slug)} className="cb-trend-left">
                  <span className="cb-trend-rank">{String(i + 1).padStart(2, "0")}</span>
                  <span className="cb-trend-title">{s.title}</span>
                </Link>
                <span className="cb-trend-views">{s.reads}</span>
              </li>
            ))}
            {stories && stories.length === 0 ? (
              <li>
                <span className="cb-trend-left">
                  <span className="cb-trend-title">Chưa có truyện cho thể loại này.</span>
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </>
  );
}
