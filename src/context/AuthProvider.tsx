import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authService from "@/services/authService";
import { AUTH_EXPIRED_EVENT } from "@/services/api/client";
import { AUTH_REFRESH_TOKEN_KEY, AUTH_TOKEN_KEY } from "@/utils/constants";
import type { AdminUser } from "@/types/domain";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [booting, setBooting] = useState(Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Re-hydrate the user from a stored token on refresh. The api client
  // transparently refreshes an expired access token, so this also recovers a
  // session whose access token lapsed while the refresh token is still valid.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setBooting(false);
      return undefined;
    }
    authService
      .me(token)
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setToken(localStorage.getItem(AUTH_TOKEN_KEY));
        }
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
    // Boot-time hydration runs once; `token` changes afterwards go through login/logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The api client fires this when a 401 could not be refreshed.
  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const res = await authService.loginWithGoogle(idToken);
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await authService.registerAndLogin({ email, password, displayName });
      setToken(res.accessToken);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    void authService.logoutSession();
    setToken(null);
    setUser(null);
  }, []);

  const reauth = useCallback(async () => {
    const res = await authService.refreshSession();
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      booting,
      isAuthenticated: Boolean(token),
      login,
      loginWithGoogle,
      register,
      logout,
      reauth,
    }),
    [token, user, booting, login, loginWithGoogle, register, logout, reauth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
