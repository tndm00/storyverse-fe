// Per-viewer reading preferences for the chapter reader (font size, colour
// theme, column width, line spacing). Persisted to localStorage only — no
// backend. Scoped to the reader view; it does not touch the site-wide theme.

import { useCallback, useEffect, useState } from "react";

export type ReaderTheme = "light" | "dark" | "sepia";

export interface ReadingSettings {
  /** index into FONT_SIZES */
  fontSize: number;
  theme: ReaderTheme;
  /** index into LINE_HEIGHTS */
  lineHeight: number;
  /** index into WIDTHS */
  width: number;
}

export const FONT_SIZES = [15, 17, 19, 21, 24];
export const LINE_HEIGHTS = [1.5, 1.7, 1.85, 2.05, 2.3];
export const WIDTHS = [600, 720, 860];

export const THEME_LABELS: Record<ReaderTheme, string> = {
  light: "Sáng",
  dark: "Tối",
  sepia: "Sepia",
};

const KEY = "sv_reader_settings";

const DEFAULTS: ReadingSettings = { fontSize: 1, theme: "light", lineHeight: 2, width: 1 };

function clampIndex(value: unknown, length: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length
    ? value
    : fallback;
}

function load(): ReadingSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ReadingSettings>;
    return {
      fontSize: clampIndex(parsed.fontSize, FONT_SIZES.length, DEFAULTS.fontSize),
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "sepia"
          ? parsed.theme
          : DEFAULTS.theme,
      lineHeight: clampIndex(parsed.lineHeight, LINE_HEIGHTS.length, DEFAULTS.lineHeight),
      width: clampIndex(parsed.width, WIDTHS.length, DEFAULTS.width),
    };
  } catch {
    return DEFAULTS;
  }
}

export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* private mode / storage disabled — preferences just won't persist */
    }
  }, [settings]);

  const update = useCallback(
    (patch: Partial<ReadingSettings>) => setSettings((s) => ({ ...s, ...patch })),
    [],
  );

  const reset = useCallback(() => setSettings(DEFAULTS), []);

  return { settings, update, reset };
}
