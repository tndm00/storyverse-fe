import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncRunner } from "@/hooks/useAsyncRunner";
import { canUseAdminConsole, hasRole, AUTHOR_ROLE } from "@/services/authService";
import { MESSAGES, ROUTES } from "@/utils/constants";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type Mode = "login" | "register";

export function AccountPage() {
  const { isAuthenticated, user, login, loginWithGoogle, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { busy, run } = useAsyncRunner();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const goToDestination = () => navigate(from ?? ROUTES.account, { replace: true });

  // Load + init Google Identity Services once, then render the button. The
  // <script> in index.html is async/defer, so `window.google` may not exist
  // yet on mount — poll briefly until it does.
  useEffect(() => {
    if (isAuthenticated || !GOOGLE_CLIENT_ID) return undefined;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const handleCredential = (response: { credential: string }) => {
      setGoogleError(null);
      void run(() => loginWithGoogle(response.credential), "Đăng nhập thành công", goToDestination);
    };

    const init = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 328,
        });
      } catch {
        setGoogleError(MESSAGES.auth.googleLoginFailed);
      }
    };

    if (window.google) {
      init();
    } else {
      pollId = setInterval(() => {
        if (window.google) {
          if (pollId) clearInterval(pollId);
          init();
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, mode]);

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
        <div className="cb-form-card cb-form-card-centered" style={{ maxWidth: 460 }}>
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
      mode === "register" ? "Chào mừng bạn đến với Truyện ma Canh Ba" : "Đăng nhập thành công",
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

      <div className="cb-form-card cb-form-card-centered" style={{ maxWidth: 460 }}>
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

        {GOOGLE_CLIENT_ID ? (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "4px 0 14px",
                color: "var(--cb-muted, #8a8a8a)",
                fontSize: 13,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "currentColor", opacity: 0.25 }} />
              <span>hoặc</span>
              <span style={{ flex: 1, height: 1, background: "currentColor", opacity: 0.25 }} />
            </div>
            <div ref={googleButtonRef} style={{ display: "flex", justifyContent: "center" }} />
            {googleError ? (
              <p style={{ color: "#c0392b", marginTop: 10, fontSize: 13 }}>{googleError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
