import { createContext } from "react";
import type { AdminUser } from "@/types/domain";

export interface AuthContextValue {
  token: string | null;
  user: AdminUser | null;
  booting: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  // Register + self-authenticate from the returned token pair.
  register: (email: string, password: string, displayName: string) => Promise<AdminUser>;
  logout: () => void;
  // Exchange the stored refresh token for a fresh access token, to pick up new
  // JWT claims (the `author_id` claim after creating an author profile).
  // Rejects with MESSAGES.auth.reauthNeeded if no refresh token is held.
  reauth: () => Promise<AdminUser>;
}

// Auth context object only. The provider lives in AuthProvider.tsx and the
// consumer hook in @/hooks/useAuth — keeping this file component-free so
// React Fast Refresh works cleanly.
export const AuthContext = createContext<AuthContextValue | null>(null);
