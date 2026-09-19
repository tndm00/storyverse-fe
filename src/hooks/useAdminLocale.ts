import { useContext } from "react";
import { AdminLocaleContext, type AdminLocaleContextValue } from "@/context/AdminLocaleContext";

export function useAdminLocale(): AdminLocaleContextValue {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) throw new Error("useAdminLocale must be used within <AdminLocaleProvider>");
  return ctx;
}
