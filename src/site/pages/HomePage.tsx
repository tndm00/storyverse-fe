import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { listStories, type ReaderStory } from "../readerService";
import { StoryCard } from "../components/StoryCard";

function Card({ story, variant }: { story: ReaderStory; variant: "feature" | "side" }) {
  return (
    <Link to={ROUTES.story(story.slug)} className={`cb-card cb-${variant}`}>
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

interface Edition {
  feature: ReaderStory;
  side: ReaderStory[];
}

function toEditions(stories: ReaderStory[]): Edition[] {
  const out: Edition[] = [];
  for (let i = 0; i < stories.length && out.length < 4; i += 3) {
    const chunk = stories.slice(i, i + 3);
    out.push({ feature: chunk[0], side: chunk.slice(1) });
  }
  return out;
}

function GridSection({
  emoji,
  title,
  seeAllHref,
  loading,
  stories,
}: {
  emoji: string;
  title: string;
  seeAllHref: string;
  loading: boolean;
  stories: ReaderStory[];
}) {
  return (
    <section className="cb-section" style={{ paddingTop: 0 }}>
      <div className="cb-section-head">
        <h2>
          {emoji} {title}
        </h2>
        <Link to={seeAllHref} className="cb-see-all">
          Xem tất cả
        </Link>
      </div>
      {loading ? (
        <p className="cb-page-intro">Đang tải truyện…</p>
      ) : stories.length === 0 ? (
        <p className="cb-page-intro">Chưa có truyện nào ở mục này.</p>
      ) : (
        <div className="cb-featured-grid">
          {stories.map((s) => (
            <StoryCard key={s.slug} story={s} />
          ))}
        </div>
      )}
    </section>
  );
}

export function HomePage() {
  const { data: stories, loading } = useAsyncQuery(
    () => listStories({ sort: "publishedAt", pageSize: 12 }),
    [],
  );
  const { data: hotStories, loading: hotLoading } = useAsyncQuery(
    () => listStories({ sort: "viewCount", pageSize: 4 }),
    [],
  );

  const editions = useMemo(() => toEditions(stories ?? []), [stories]);
  // Reuse the hero fetch for "Truyện ma mới": the hero shows stories[0] as its
  // feature, so the grid below picks up from stories[1] to avoid duplicates.
  const newStories = useMemo(() => (stories ?? []).slice(1, 5), [stories]);
  const [edition, setEdition] = useState(0);

  const count = editions.length;
  const current = count > 0 ? editions[Math.min(edition, count - 1)] : null;
  const go = (delta: number) => setEdition((e) => (count ? (e + delta + count) % count : 0));

  return (
    <>
      <section className="cb-hero">
        <div className="cb-hero-head">
          <h1>Những chuyện kể khi đèn đã tắt</h1>
          <p>Truyện được góp bởi người kể — chọn lọc mỗi tuần cho những ai còn thức lúc canh ba.</p>
        </div>

        {current ? (
          <>
            <div className="cb-hero-grid">
              <Card story={current.feature} variant="feature" />
              <div className="cb-side-stack">
                {current.side.map((s) => (
                  <Card key={s.slug} story={s} variant="side" />
                ))}
              </div>
            </div>

            {count > 1 ? (
              <div className="cb-dots">
                <button
                  type="button"
                  className="cb-arrow"
                  aria-label="Tuyển tập trước"
                  onClick={() => go(-1)}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 5 8 12l7 7" />
                  </svg>
                </button>
                {editions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === Math.min(edition, count - 1) ? "is-active" : undefined}
                    aria-label={`Tuyển tập ${i + 1}`}
                    aria-current={i === edition}
                    onClick={() => setEdition(i)}
                  >
                    <span className="cb-dot" />
                  </button>
                ))}
                <button
                  type="button"
                  className="cb-arrow"
                  aria-label="Tuyển tập sau"
                  onClick={() => go(1)}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m9 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : null}
          </>
        ) : loading ? (
          <p className="cb-page-intro">Đang tải truyện…</p>
        ) : (
          <p className="cb-page-intro">Chưa có truyện nào. Hãy là người đầu tiên đăng!</p>
        )}
      </section>

      <GridSection
        emoji="🔥"
        title="Truyện ma hot"
        seeAllHref={`${ROUTES.browse}?sort=viewCount`}
        loading={hotLoading}
        stories={hotStories ?? []}
      />

      <GridSection
        emoji="🕯️"
        title="Truyện ma mới"
        seeAllHref={`${ROUTES.browse}?sort=publishedAt`}
        loading={loading}
        stories={newStories}
      />

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-cta-band">
          <div>
            <h2>Bạn cũng có một câu chuyện?</h2>
            <p>Gửi bài viết của bạn — chúng tôi biên tập cùng bạn trước khi đăng.</p>
          </div>
          <div className="cb-cta-actions">
            <Link to={ROUTES.community} className="cb-btn cb-ghost">
              Xem cộng đồng
            </Link>
            <Link to={ROUTES.submit} className="cb-btn">
              Gửi câu chuyện
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
