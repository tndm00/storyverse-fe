import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { MESSAGES, ROUTES } from "@/utils/constants";
import { becomeAuthor, hasAuthorProfile } from "../authorService";

type Check = "checking" | "none" | "has";

export function BecomeAuthorPage() {
  const { user, reauth, login } = useAuth();
  const navigate = useNavigate();
  const { busy, run } = useAsyncRunner();

  const [check, setCheck] = useState<Check>("checking");
  const [penName, setPenName] = useState("");
  const [bio, setBio] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  // shown only if reauth() can't run silently (page was reloaded)
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    hasAuthorProfile()
      .then((p) => {
        if (!cancelled) setCheck(p ? "has" : "none");
      })
      .catch(() => {
        if (!cancelled) setCheck("none");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (check === "checking") return <p className="cb-page-intro">Đang kiểm tra…</p>;
  if (check === "has") return <Navigate to={ROUTES.authorStudio} replace />;

  const finish = () => navigate(ROUTES.authorStudio, { replace: true });

  const submit = () =>
    run(
      async () => {
        await becomeAuthor({ penName, bio, avatarUrl, bannerUrl });
        // The new Author role + author_id claim only land in a fresh token.
        try {
          await reauth();
        } catch (err) {
          if (err instanceof Error && err.message === MESSAGES.auth.reauthNeeded) {
            setNeedPassword(true);
            throw err;
          }
          throw err;
        }
      },
      "Bạn đã trở thành người kể chuyện",
      finish,
    );

  const confirmPassword = () =>
    run(
      async () => {
        if (!user?.email) throw new Error("Phiên đăng nhập không hợp lệ.");
        await login(user.email, password);
      },
      "Đã xác nhận",
      finish,
    );

  return (
    <section className="cb-section">
      <div className="cb-hero-head">
        <h1>Trở thành người kể chuyện</h1>
        <p className="cb-page-intro">
          Tạo hồ sơ tác giả để bắt đầu đăng truyện. Bút danh sẽ hiển thị cùng mỗi câu chuyện bạn
          đăng.
        </p>
      </div>

      <div className="cb-form-card cb-form-card-centered" style={{ maxWidth: 520 }}>
        {needPassword ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmPassword();
            }}
          >
            <p className="cb-field-label">
              Hồ sơ đã được tạo. Nhập lại mật khẩu để hoàn tất đăng nhập với quyền tác giả.
            </p>
            <div className="cb-field">
              <label className="cb-field-label" htmlFor="ba-pw">
                Mật khẩu
              </label>
              <input
                className="cb-input"
                id="ba-pw"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="cb-btn cb-block" type="submit" disabled={busy}>
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="cb-field">
              <label className="cb-field-label" htmlFor="ba-pen">
                Bút danh
              </label>
              <input
                className="cb-input"
                id="ba-pen"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                placeholder="Ví dụ: Người Kể Đêm"
                required
              />
            </div>
            <div className="cb-field">
              <label className="cb-field-label" htmlFor="ba-bio">
                Giới thiệu (tuỳ chọn)
              </label>
              <textarea
                className="cb-input"
                id="ba-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ minHeight: 90 }}
              />
            </div>

            {showOptional ? (
              <>
                <div className="cb-field">
                  <label className="cb-field-label" htmlFor="ba-avatar">
                    Ảnh đại diện (URL)
                  </label>
                  <input
                    className="cb-input"
                    id="ba-avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                </div>
                <div className="cb-field">
                  <label className="cb-field-label" htmlFor="ba-banner">
                    Ảnh bìa hồ sơ (URL)
                  </label>
                  <input
                    className="cb-input"
                    id="ba-banner"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <button
                type="button"
                className="cb-btn cb-ghost cb-btn-sm"
                onClick={() => setShowOptional(true)}
                style={{ marginBottom: 16 }}
              >
                Tuỳ chọn thêm
              </button>
            )}

            <button className="cb-btn cb-block" type="submit" disabled={busy}>
              {busy ? "Đang tạo…" : "Tạo hồ sơ tác giả"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
