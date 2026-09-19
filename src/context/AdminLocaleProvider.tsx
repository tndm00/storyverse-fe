import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ADMIN_LOCALE_STORAGE_KEY, DEFAULT_ADMIN_LOCALE } from "@/utils/constants";
import { ADMIN_LOCALES, type AdminLocale } from "@/i18n/types";
import { translate, translateEnum } from "@/i18n/translate";
import { compactNumber, formatIsoDate, formatIsoDateVi, formatNumber, fromNow } from "@/utils/format";
import { AdminLocaleContext, type AdminLocaleContextValue } from "./AdminLocaleContext";

function readLocale(): AdminLocale {
  try {
    const stored = localStorage.getItem(ADMIN_LOCALE_STORAGE_KEY);
    if (stored && (ADMIN_LOCALES as readonly string[]).includes(stored)) return stored as AdminLocale;
  } catch {
    // Storage blocked (private mode): fall through to the default language.
  }
  return DEFAULT_ADMIN_LOCALE;
}

/**
 * Holds the admin console's language and exposes t()/format helpers bound to it. It must sit OUTSIDE
 * AdminThemeProvider, because the theme provider passes the matching Ant Design locale to its
 * ConfigProvider (built-in texts like "No data" and the modal buttons).
 */
export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>(readLocale);

  const setLocale = useCallback((next: AdminLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(ADMIN_LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode — the choice just is not remembered */
    }
  }, []);

  // Keep <html lang> right for the admin console (screen readers, browser translation), and restore
  // the previous value when leaving it.
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [locale]);

  const value = useMemo<AdminLocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      tEnum: (group, raw) => translateEnum(locale, group, raw),
      fromNow: (v) => fromNow(v, locale),
      formatNumber: (v) => formatNumber(v, locale),
      compactNumber: (v) => compactNumber(v, locale),
      formatIsoDate: (v) => (locale === "vi" ? formatIsoDateVi(v) : formatIsoDate(v)),
    }),
    [locale, setLocale],
  );

  return <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>;
}
