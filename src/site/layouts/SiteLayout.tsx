import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ROUTES, SITE_LABELS } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { AUTHOR_ROLE, canUseAdminConsole, hasRole } from "@/services/authService";
import { NotificationBell } from "../components/NotificationBell";
import "../site.css";

type CbTheme = "dark" | "light";

const THEME_KEY = "cb-theme";
const BODY_BG: Record<CbTheme, string> = { dark: "#181b1d", light: "#f4f0e9" };

function readTheme(): CbTheme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const NAV: { label: string; to: string; end?: boolean }[] = [
  { label: "Trang chủ", to: ROUTES.home, end: true },
  { label: "Nổi bật", to: ROUTES.featured },
  { label: "Khám phá", to: ROUTES.browse },
  { label: "Theo chủ đề", to: ROUTES.topics },
  { label: "Cộng đồng kể chuyện", to: ROUTES.community },
  { label: "Gửi câu chuyện", to: ROUTES.submit },
];

// Public reader-facing shell for Canh Ba. Sticky header, hero-less content
// via <Outlet />, footer. The admin console lives under /admin behind its own
// layout and keeps the Ant Design theme untouched.
export function SiteLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<CbTheme>(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.cbTheme = theme;
    const prevBg = document.body.style.background;
    document.body.style.background = BODY_BG[theme];
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode — fine */
    }
    return () => {
      delete root.dataset.cbTheme;
      document.body.style.background = prevBg;
    };
  }, [theme]);

  return (
    <div className="canhba">
      <header className="cb-header">
        <div className="cb-wrap cb-header-row">
          <Link to={ROUTES.home} className="cb-brand" aria-label="Canh Ba — trang chủ">
            <span className="cb-brand-mark" aria-hidden="true">
              CB
            </span>
            <span>
              <span className="cb-brand-name">{SITE_LABELS.brand}</span>
              <span className="cb-brand-tag">{SITE_LABELS.tagline}</span>
            </span>
          </Link>

          <nav className={`cb-nav${navOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
            <ul className="cb-menu">
              {NAV.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => (isActive ? "active" : undefined)}
                    onClick={() => setNavOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="cb-tools">
            <button
              type="button"
              className="cb-icon-btn"
              aria-label={
                theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"
              }
              aria-pressed={theme === "light"}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              )}
            </button>

            <button type="button" className="cb-icon-btn" aria-label="Tìm kiếm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            {isAuthenticated ? <NotificationBell /> : null}

            {isAuthenticated ? (
              <div className="cb-account">
                <button
                  type="button"
                  className="cb-btn cb-ghost"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  {user?.displayName || "Tài khoản"}
                </button>
                {menuOpen ? (
                  <div className="cb-account-menu">
                    {hasRole(user?.roles, AUTHOR_ROLE) ? (
                      <Link to={ROUTES.authorStudio} onClick={() => setMenuOpen(false)}>
                        Truyện của tôi
                      </Link>
                    ) : null}
                    <Link to={ROUTES.account} onClick={() => setMenuOpen(false)}>
                      Tài khoản
                    </Link>
                    {canUseAdminConsole(user?.roles) ? (
                      <Link to={ROUTES.admin.dashboard} onClick={() => setMenuOpen(false)}>
                        Bảng điều khiển
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link to={ROUTES.account} className="cb-btn cb-ghost">
                {SITE_LABELS.signIn}
              </Link>
            )}

            <button
              type="button"
              className="cb-nav-toggle"
              aria-label="Mở menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="cb-wrap">
        <Outlet />
      </main>

      <footer className="cb-footer">
        <div className="cb-wrap cb-footer-row">
          <span>© 2026 {SITE_LABELS.brand}. Mọi câu chuyện đều thuộc về người kể.</span>
          <div className="cb-footer-links">
            <span className="cb-soon">Quy định đăng bài</span>
            <span className="cb-soon">Liên hệ</span>
            <span className="cb-soon">Quyền riêng tư</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
