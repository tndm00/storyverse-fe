import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { canUseAdminConsole, hasRole, AUTHOR_ROLE } from "@/services/authService";
import { ROUTES } from "@/utils/constants";

type Mode = "login" | "register";

export function AccountPage() {
  const { isAuthenticated, user, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { busy, run } = useAsyncRunner();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (isAuthenticated && user) {
    const isAuthor = hasRole(user.roles, AUTHOR_ROLE);
    return (
      <section className="cb-section">
        <div className="cb-hero-head">
          <h1>Tài khoản</h1>
          <p className="cb-page-intro">
            {user.displayName} · {user.email}
          </p>
          <div className="cb-chips">
            {(user.roles ?? []).map((r) => (
              <span className="cb-chip" key={r}>
                {r}
              </span>
            ))}
          </div>
        </div>
        <div className="cb-form-card" style={{ maxWidth: 460 }}>
          {isAuthor ? (
            <Link to={ROUTES.authorStudio} className="cb-btn cb-block">
              Truyện của tôi
            </Link>
          ) : (
            <Link to={ROUTES.authorOnboard} className="cb-btn cb-block">
              Trở thành người kể chuyện
            </Link>
          )}
          {canUseAdminConsole(user.roles) ? (
            <Link
              to={ROUTES.admin.dashboard}
              className="cb-btn cb-ghost cb-block"
              style={{ marginTop: 10 }}
            >
              Bảng điều khiển
            </Link>
          ) : null}
          <button
            type="button"
            className="cb-btn cb-ghost cb-block"
            style={{ marginTop: 10 }}
            onClick={() => logout()}
          >
            Đăng xuất
          </button>
        </div>
      </section>
    );
  }

  const submit = () =>
    run(
      async () => {
        if (mode === "register") {
          await register(email, password, displayName);
        } else {
          await login(email, password);
        }
      },
      mode === "register" ? "Chào mừng bạn đến với Canh Ba" : "Đăng nhập thành công",
      () => navigate(from ?? ROUTES.account, { replace: true }),
    );

  return (
    <section className="cb-section">
      <div className="cb-hero-head">
        <h1>{mode === "login" ? "Đăng nhập" : "Đăng ký"}</h1>
        <p className="cb-page-intro">
          Đăng nhập để theo dõi truyện, bình luận và đăng câu chuyện của riêng bạn.
        </p>
      </div>

      <div className="cb-form-card" style={{ maxWidth: 460 }}>
        <div className="cb-segmented">
          <button
            type="button"
            className={mode === "login" ? "is-active" : undefined}
            onClick={() => setMode("login")}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={mode === "register" ? "is-active" : undefined}
            onClick={() => setMode("register")}
          >
            Đăng ký
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === "register" ? (
            <div className="cb-field">
              <label className="cb-field-label" htmlFor="acc-name">
                Tên hiển thị
              </label>
              <input
                className="cb-input"
                id="acc-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          ) : null}
          <div className="cb-field">
            <label className="cb-field-label" htmlFor="acc-email">
              Email
            </label>
            <input
              className="cb-input"
              id="acc-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="cb-field">
            <label className="cb-field-label" htmlFor="acc-pw">
              Mật khẩu
            </label>
            <input
              className="cb-input"
              id="acc-pw"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="cb-btn cb-block" type="submit" disabled={busy}>
            {busy ? "Đang xử lý…" : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </section>
  );
}
