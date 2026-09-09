import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as authService from "@/services/authService";
import { AUTH_TOKEN_KEY, MESSAGES } from "@/utils/constants";
import type { AdminUser } from "@/types/domain";
import { AuthContext, type AuthContextValue } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AdminUser | null>(null);
  const [booting, setBooting] = useState(Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));
  // Session-scoped, never persisted — see AuthContextValue.reauth.
  const lastPasswordRef = useRef<string | null>(null);

  // Re-hydrate the user from a stored token on refresh.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setBooting(false);
      return undefined;
    }
    authService
      .me(token)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
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

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, res.accessToken);
    lastPasswordRef.current = password;
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    lastPasswordRef.current = null;
    setToken(null);
    setUser(null);
  }, []);

  const reauth = useCallback(async () => {
    const email = user?.email;
    const password = lastPasswordRef.current;
    if (!email || !password) throw new Error(MESSAGES.auth.reauthNeeded);
    const res = await authService.login(email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, booting, isAuthenticated: Boolean(token), login, logout, reauth }),
    [token, user, booting, login, logout, reauth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
