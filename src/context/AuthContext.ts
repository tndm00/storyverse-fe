import { createContext } from "react";
import type { AdminUser } from "@/types/domain";

export interface AuthContextValue {
  token: string | null;
  user: AdminUser | null;
  booting: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => void;
  // Re-login with the password from this session's last successful login, to pick
  // up new JWT claims (the `author_id` claim after creating an author profile).
  // Rejects with MESSAGES.auth.reauthNeeded if no password is held (page reload).
  reauth: () => Promise<AdminUser>;
}

// Auth context object only. The provider lives in AuthProvider.tsx and the
// consumer hook in @/hooks/useAuth — keeping this file component-free so
// React Fast Refresh works cleanly.
export const AuthContext = createContext<AuthContextValue | null>(null);
