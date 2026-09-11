import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { listStories, type ReaderStory } from "../readerService";

function ListSection({
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
        <ul className="cb-trend">
          {stories.map((s, i) => (
            <li key={s.slug}>
              <Link to={ROUTES.story(s.slug)} className="cb-trend-left">
                <span className="cb-trend-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="cb-trend-title">{s.title}</span>
              </Link>
              <span className="cb-trend-views">{s.reads}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HomePage() {
  const { data: newStories, loading: newLoading } = useAsyncQuery(
    () => listStories({ sort: "publishedAt", pageSize: 10 }),
    [],
  );
  const { data: hotStories, loading: hotLoading } = useAsyncQuery(
    () => listStories({ sort: "viewCount", pageSize: 10 }),
    [],
  );

  return (
    <>
      <section className="cb-hero">
        <div className="cb-hero-head">
          <h1>Những chuyện kể khi đèn đã tắt</h1>
          <p>Truyện được góp bởi người kể — chọn lọc mỗi tuần cho những ai còn thức lúc canh ba.</p>
        </div>
      </section>

      <ListSection
        emoji="🔥"
        title="Truyện ma hot"
        seeAllHref={`${ROUTES.browse}?sort=viewCount`}
        loading={hotLoading}
        stories={hotStories ?? []}
      />

      <ListSection
        emoji="🕯️"
        title="Truyện ma mới"
        seeAllHref={`${ROUTES.browse}?sort=publishedAt`}
        loading={newLoading}
        stories={newStories ?? []}
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
