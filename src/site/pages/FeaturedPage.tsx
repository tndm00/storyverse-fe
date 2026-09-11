import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { listStories, trendingStories } from "../readerService";
import { StoryListRow } from "../components/StoryListRow";

export function FeaturedPage() {
  const { data: picks } = useAsyncQuery(() => listStories({ sort: "ratingAvg", pageSize: 10 }), []);
  const { data: trending } = useAsyncQuery(() => trendingStories(10), []);

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
        <div className="cb-section-head">
          <h2>Đánh giá cao</h2>
        </div>
        {picks === null ? (
          <p className="cb-page-intro">Đang tải truyện…</p>
        ) : picks.length === 0 ? (
          <p className="cb-page-intro">Chưa có truyện nào được đánh giá.</p>
        ) : (
          <ul className="cb-trend">
            {picks.map((s) => (
              <StoryListRow key={s.slug} story={s} />
            ))}
          </ul>
        )}
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
