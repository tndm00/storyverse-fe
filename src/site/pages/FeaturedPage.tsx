import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useMockQuery } from "@/hooks/useMockQuery";
import { listStories, type ReaderStory } from "../readerService";
import { SPOTLIGHT, COMMUNITY_RECOMMENDED } from "../siteContent";

function PickCard({ story }: { story: ReaderStory }) {
  return (
    <Link to={ROUTES.story(story.slug)} className="cb-card cb-grid-item">
      <div className="cb-media">
        {story.ratingLabel ? <span className="cb-readchip">{story.ratingLabel}</span> : null}
        <span className="cb-dropcap" aria-hidden="true">
          {story.letter}
        </span>
      </div>
      <div className="cb-body">
        <div className="cb-kicker">{story.kicker}</div>
        <h3>{story.title}</h3>
        {story.description ? <p className="cb-excerpt">{story.description}</p> : null}
        <div className="cb-meta">{story.reads}</div>
      </div>
    </Link>
  );
}

export function FeaturedPage() {
  const { data: picks } = useMockQuery(() => listStories({ sort: "ratingAvg", pageSize: 6 }), []);

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Nổi bật</h1>
          <p className="cb-page-intro">
            Những câu chuyện được biên tập chọn và được cộng đồng đọc nhiều nhất trong tuần.
          </p>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-spotlight">
          <div className="cb-media">
            <span className="cb-dropcap" aria-hidden="true">
              {SPOTLIGHT.letter}
            </span>
          </div>
          <div className="cb-spotlight-content">
            <div className="cb-kicker">{SPOTLIGHT.kicker}</div>
            <h2>{SPOTLIGHT.title}</h2>
            <p className="cb-excerpt">{SPOTLIGHT.excerpt}</p>
            <div className="cb-meta">{SPOTLIGHT.meta}</div>
            <Link to={ROUTES.story(SPOTLIGHT.slug)} className="cb-btn">
              Đọc ngay
            </Link>
          </div>
        </div>

        <div className="cb-featured-grid">
          {(picks ?? []).map((story) => (
            <PickCard key={story.slug} story={story} />
          ))}
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-section-head">
          <h2>Được cộng đồng đề cử</h2>
        </div>
        <ul className="cb-trend">
          {COMMUNITY_RECOMMENDED.map((item) => (
            <li key={item.slug}>
              <Link to={ROUTES.story(item.slug)} className="cb-trend-left">
                <span className="cb-trend-rank">·</span>
                <span>
                  <span className="cb-trend-title" style={{ display: "block" }}>
                    {item.title}
                  </span>
                  <span className="cb-trend-sub">{item.sub}</span>
                </span>
              </Link>
              <span className="cb-trend-views">{item.reads}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
