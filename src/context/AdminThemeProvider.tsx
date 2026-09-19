import { useEffect, useMemo, useState, type ReactNode } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { ADMIN_THEME_STORAGE_KEY } from "@/utils/constants";
import { ADMIN_PAGE_BACKGROUND, buildAdminTheme } from "@/theme/antdTheme";
import { AdminThemeContext, type AdminThemeMode } from "./AdminThemeContext";

function readMode(): AdminThemeMode {
  try {
    return localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    // Storage blocked (private mode): fall back to the default light theme.
    return "light";
  }
}

/**
 * Holds the admin console's light/dark choice and applies it to everything inside. The nested
 * <App> matters: message/modal calls made through App.useApp() render through the closest <App>,
 * so without it they would keep the site-wide light theme.
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AdminThemeMode>(readMode);

  const setMode = (next: AdminThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(ADMIN_THEME_STORAGE_KEY, next);
    } catch {
      /* private mode — the choice just is not remembered */
    }
  };

  // Paint the page behind the layout too, and restore it when leaving the admin console.
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = ADMIN_PAGE_BACKGROUND[mode];
    return () => {
      document.body.style.background = previous;
    };
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return (
    <AdminThemeContext.Provider value={value}>
      <ConfigProvider theme={buildAdminTheme(mode)}>
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </AdminThemeContext.Provider>
  );
}
