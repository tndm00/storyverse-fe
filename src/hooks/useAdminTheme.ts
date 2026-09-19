import { useContext } from "react";
import { AdminThemeContext, type AdminThemeContextValue } from "@/context/AdminThemeContext";

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within <AdminThemeProvider>");
  return ctx;
}
