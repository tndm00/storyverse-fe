import { createContext } from "react";
import type { AdminLocale, MessageParams } from "@/i18n/types";
import type { MessageKey } from "@/i18n/messages";
import type { EnumGroup } from "@/i18n/translate";

export interface AdminLocaleContextValue {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  /** Text for a message key in the current language; {name} placeholders come from `params`. */
  t: (key: MessageKey, params?: MessageParams) => string;
  /** Display text for a server enum value (status, reason, ...). */
  tEnum: (group: EnumGroup, value: string | null | undefined) => string;
  /** "3 hours ago" / "3 giờ trước". */
  fromNow: (value: string | number | Date | null | undefined) => string;
  formatNumber: (value: number | null | undefined) => string;
  compactNumber: (value: number | null | undefined) => string;
  /** "2026-09-19" -> "19/09/2026" (vi) or "2026-09-19" (en). */
  formatIsoDate: (value: string | null | undefined) => string;
}

// Context object only. The provider lives in AdminLocaleProvider.tsx and the consumer hook in
// @/hooks/useAdminLocale — keeping this file component-free so React Fast Refresh works cleanly.
export const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);
