import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { listStories, trendingStories } from "../readerService";
import { StoryCard } from "../components/StoryCard";

export function FeaturedPage() {
  // Highest-rated stories from the Content service; the top one is the spotlight,
  // the rest fill the grid below it.
  const { data: picks } = useAsyncQuery(() => listStories({ sort: "ratingAvg", pageSize: 7 }), []);
  const { data: trending } = useAsyncQuery(() => trendingStories(5), []);

  const spotlight = picks && picks.length > 0 ? picks[0] : null;
  const grid = picks && picks.length > 1 ? picks.slice(1) : [];

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Nổi bật</h1>
          <p className="cb-page-intro">
            Những câu chuyện được đánh giá cao và được cộng đồng đọc nhiều nhất.
          </p>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        {spotlight ? (
          <div className="cb-spotlight">
            <div className="cb-media">
              {spotlight.ratingLabel ? (
                <span className="cb-readchip">{spotlight.ratingLabel}</span>
              ) : null}
              <span className="cb-dropcap" aria-hidden="true">
                {spotlight.letter}
              </span>
            </div>
            <div className="cb-spotlight-content">
              <div className="cb-kicker">{spotlight.kicker}</div>
              <h2>{spotlight.title}</h2>
              {spotlight.description ? <p className="cb-excerpt">{spotlight.description}</p> : null}
              <div className="cb-meta">{spotlight.reads}</div>
              <Link to={ROUTES.story(spotlight.slug)} className="cb-btn">
                Đọc ngay
              </Link>
            </div>
          </div>
        ) : picks === null ? (
          <p className="cb-page-intro">Đang tải truyện…</p>
        ) : (
          <p className="cb-page-intro">Chưa có truyện nào được đánh giá.</p>
        )}

        <div className="cb-featured-grid">
          {grid.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Đang được đọc nhiều</h2>
        </div>
        <ul className="cb-trend">
          {(trending ?? []).map((item, i) => (
            <li key={item.slug}>
              <Link to={ROUTES.story(item.slug)} className="cb-trend-left">
                <span className="cb-trend-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="cb-trend-title">{item.title}</span>
              </Link>
              <span className="cb-trend-views">{item.reads}</span>
            </li>
          ))}
          {trending && trending.length === 0 ? (
            <li>
              <span className="cb-trend-left">
                <span className="cb-trend-title">Chưa có truyện nào.</span>
              </span>
            </li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
