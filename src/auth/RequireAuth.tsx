import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "@/hooks/useAuth";
import { canUseAdminConsole } from "@/services/authService";
import { ROUTES } from "@/utils/constants";

interface RequireAuthProps {
  children: ReactNode;
  // Where to send an unauthenticated visitor. Admin routes use the admin
  // /login; reader-site author routes pass ROUTES.account (the Canh Ba page).
  loginPath?: string;
  // Additionally require an admin-console role (PlatformAdmin / Moderator).
  requireAdminConsole?: boolean;
}

export function RequireAuth({
  children,
  loginPath = ROUTES.login,
  requireAdminConsole = false,
}: RequireAuthProps) {
  const { isAuthenticated, booting, user } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (requireAdminConsole && !canUseAdminConsole(user?.roles)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return children;
}
