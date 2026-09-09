import { COMMUNITY_STATS, CONTRIBUTORS, DISCUSSIONS } from "../siteContent";

export function CommunityPage() {
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
          {COMMUNITY_STATS.map((s) => (
            <div className="cb-stat" key={s.label}>
              <div className="cb-stat-value">{s.value}</div>
              <div className="cb-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="cb-section-head" style={{ marginTop: 32 }}>
          <h2>Người kể được yêu thích</h2>
        </div>
        <div className="cb-contributor-grid">
          {CONTRIBUTORS.map((c) => (
            <div className="cb-contributor-card" key={c.name}>
              <div className="cb-contributor-top">
                <div className="cb-avatar" aria-hidden="true">
                  {c.initials}
                </div>
                <div>
                  <div className="cb-contributor-name">{c.name}</div>
                  <div className="cb-contributor-role">{c.role}</div>
                </div>
              </div>
              <p className="cb-contributor-bio">{c.bio}</p>
              <div className="cb-contributor-count">{c.count}</div>
            </div>
          ))}
        </div>

        <div className="cb-section-head" style={{ marginTop: 32 }}>
          <h2>Đang thảo luận</h2>
        </div>
        <ul className="cb-trend">
          {DISCUSSIONS.map((d) => (
            <li key={d.id}>
              <span className="cb-trend-left">
                <span className="cb-trend-rank">·</span>
                <span className="cb-trend-title">{d.title}</span>
              </span>
              <span className="cb-trend-views">{d.replies}</span>
            </li>
          ))}
        </ul>

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
