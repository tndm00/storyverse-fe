import { Link } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { useAsyncQuery } from "@/hooks/useAsyncQuery";
import { listMyStories } from "../authorService";
import { AuthorGuard } from "../components/author/AuthorGuard";

const STATUS_LABEL: Record<string, string> = {
  Draft: "Nháp",
  Ongoing: "Đang ra",
  Completed: "Hoàn thành",
  Hiatus: "Tạm dừng",
  Dropped: "Đã bỏ",
};

function StudioBody() {
  const { data: stories, loading } = useAsyncQuery(() => listMyStories(), []);

  return (
    <>
      <section className="cb-section">
        <div className="cb-section-head">
          <h1>Truyện của tôi</h1>
          <Link to={ROUTES.authorPublish} className="cb-btn cb-btn-sm">
            ＋ Đăng truyện mới
          </Link>
        </div>
        <p className="cb-page-intro">
          Tất cả truyện thuộc tài khoản của bạn, gồm cả bản nháp chưa đăng.
        </p>
      </section>

      <section className="cb-section" style={{ paddingTop: 0 }}>
        {loading ? (
          <p className="cb-page-intro">Đang tải…</p>
        ) : !stories || stories.length === 0 ? (
          <p className="cb-page-intro">Bạn chưa đăng truyện nào.</p>
        ) : (
          <ul className="cb-trend">
            {stories.map((s) => (
              <li key={s.slug}>
                <Link to={ROUTES.authorStory(s.slug)} className="cb-trend-left">
                  <span className="cb-trend-title">{s.title}</span>
                </Link>
                <span className="cb-badge">{STATUS_LABEL[s.status] ?? s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function AuthorStudioPage() {
  return (
    <AuthorGuard>
      <StudioBody />
    </AuthorGuard>
  );
}
