import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { browseStories } from "../readerService";

export function CommunityPage() {
  // Only real, backend-backed number available for this page today: total
  // published stories (Content service paged listing's totalCount). There is
  // no aggregate endpoint yet for storyteller count or comment count, and no
  // "featured contributors" / "discussion board" endpoint at all — see report.
  const { data: storyCount } = useAsyncQuery(
    () => browseStories({ pageSize: 1 }).then((r) => r.totalCount),
    [],
  );

  const vi = new Intl.NumberFormat("vi-VN");

  return (
    <>
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Cộng đồng kể chuyện</h1>
          <p className="cb-page-intro">
            Nơi người kể và người đọc cùng bàn về những câu chuyện — góp truyện, bình luận, và đặt
            câu hỏi tâm linh.
          </p>
        </div>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        <div className="cb-stats-row">
          <div className="cb-stat">
            <div className="cb-stat-value">
              {storyCount != null ? vi.format(storyCount) : "…"}
            </div>
            <div className="cb-stat-label">truyện đã đăng</div>
          </div>
        </div>

        <div className="cb-cta-band" style={{ marginTop: 32 }}>
          <div>
            <h2>Muốn góp mặt trong cộng đồng?</h2>
            <p>Tham gia để bình luận, theo dõi người kể yêu thích và nhận thông báo truyện mới.</p>
          </div>
          <div className="cb-cta-actions">
            <button type="button" className="cb-btn">
              Tham gia cộng đồng
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
