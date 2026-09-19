import { theme, type ThemeConfig } from "antd";

// Shared Ant Design theme tokens. Passed to <ConfigProvider theme={...}>.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: "#5b21b6",
    colorInfo: "#5b21b6",
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      headerHeight: 56,
      bodyBg: "#f4f5f7",
      siderBg: "#1f1235",
    },
    Menu: {
      darkItemBg: "#1f1235",
      darkSubMenuItemBg: "#1f1235",
      darkItemSelectedBg: "#5b21b6",
    },
  },
};

/**
 * Admin console theme for the given mode. Light is the shared theme above; dark runs Ant Design's
 * dark algorithm with a brighter primary (the light purple is too dim on a dark surface) and the
 * layout surfaces overridden so they do not keep the light theme's white header and grey body.
 */
export function buildAdminTheme(mode: "light" | "dark"): ThemeConfig {
  if (mode === "light") return antdTheme;

  return {
    algorithm: theme.darkAlgorithm,
    token: { ...antdTheme.token, colorPrimary: "#8b5cf6", colorInfo: "#8b5cf6" },
    components: {
      Layout: {
        headerBg: "#141414",
        headerHeight: 56,
        bodyBg: "#0d0d0f",
        siderBg: "#1f1235",
      },
      Menu: {
        darkItemBg: "#1f1235",
        darkSubMenuItemBg: "#1f1235",
        darkItemSelectedBg: "#5b21b6",
      },
    },
  };
}

// Page background behind the admin layout, so overscroll and short pages match the theme.
export const ADMIN_PAGE_BACKGROUND = { light: "#f4f5f7", dark: "#0d0d0f" } as const;
