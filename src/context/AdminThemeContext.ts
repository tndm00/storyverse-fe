import { createContext } from "react";

export type AdminThemeMode = "light" | "dark";

export interface AdminThemeContextValue {
  mode: AdminThemeMode;
  setMode: (mode: AdminThemeMode) => void;
}

// Context object only. The provider lives in AdminThemeProvider.tsx and the consumer hook in
// @/hooks/useAdminTheme — keeping this file component-free so React Fast Refresh works cleanly.
export const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);
