import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/utils/constants";
import { hasAuthorProfile } from "../../authorService";

type State = "checking" | "author" | "no-profile" | "error";

// Wraps an author-only page. Assumes the route already passed <RequireAuth> —
// this only checks that the logged-in user has an author profile, redirecting to
// onboarding when they don't.
export function AuthorGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let cancelled = false;
    hasAuthorProfile()
      .then((profile) => {
        if (!cancelled) setState(profile ? "author" : "no-profile");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return <p className="cb-page-intro">Đang kiểm tra tài khoản…</p>;
  }
  if (state === "no-profile") {
    return <Navigate to={ROUTES.authorOnboard} replace />;
  }
  if (state === "error") {
    return (
      <p className="cb-page-intro">Không tải được thông tin tác giả. Vui lòng tải lại trang.</p>
    );
  }
  return <>{children}</>;
}
