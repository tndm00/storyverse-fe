import {
  FONT_SIZES,
  LINE_HEIGHTS,
  THEME_LABELS,
  WIDTHS,
  type ReaderTheme,
  type ReadingSettings,
} from "./readingSettings";

const THEMES: ReaderTheme[] = ["light", "dark", "sepia"];
const WIDTH_LABELS = ["Hẹp", "Vừa", "Rộng"];

export function ReadingSettingsPanel({
  settings,
  update,
  reset,
  onClose,
}: {
  settings: ReadingSettings;
  update: (patch: Partial<ReadingSettings>) => void;
  reset: () => void;
  onClose: () => void;
}) {
  const step = (key: "fontSize" | "lineHeight", delta: number, length: number) => {
    const next = Math.min(length - 1, Math.max(0, settings[key] + delta));
    if (next !== settings[key]) update({ [key]: next });
  };

  return (
    <div className="cb-reader-settings" role="group" aria-label="Cài đặt đọc">
      <div className="cb-reader-settings-row">
        <span className="cb-field-label">Cỡ chữ</span>
        <div className="cb-reader-settings-controls">
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            disabled={settings.fontSize === 0}
            onClick={() => step("fontSize", -1, FONT_SIZES.length)}
            aria-label="Giảm cỡ chữ"
          >
            A−
          </button>
          <span className="cb-reader-settings-value">{FONT_SIZES[settings.fontSize]}px</span>
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            disabled={settings.fontSize === FONT_SIZES.length - 1}
            onClick={() => step("fontSize", 1, FONT_SIZES.length)}
            aria-label="Tăng cỡ chữ"
          >
            A+
          </button>
        </div>
      </div>

      <div className="cb-reader-settings-row">
        <span className="cb-field-label">Giao diện đọc</span>
        <div className="cb-reader-settings-controls">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={
                settings.theme === t ? "cb-btn cb-btn-sm" : "cb-btn cb-ghost cb-btn-sm"
              }
              aria-pressed={settings.theme === t}
              onClick={() => update({ theme: t })}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="cb-reader-settings-row">
        <span className="cb-field-label">Khoảng cách dòng</span>
        <div className="cb-reader-settings-controls">
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            disabled={settings.lineHeight === 0}
            onClick={() => step("lineHeight", -1, LINE_HEIGHTS.length)}
            aria-label="Giảm khoảng cách dòng"
          >
            −
          </button>
          <span className="cb-reader-settings-value">
            {LINE_HEIGHTS[settings.lineHeight].toFixed(2)}
          </span>
          <button
            type="button"
            className="cb-btn cb-ghost cb-btn-sm"
            disabled={settings.lineHeight === LINE_HEIGHTS.length - 1}
            onClick={() => step("lineHeight", 1, LINE_HEIGHTS.length)}
            aria-label="Tăng khoảng cách dòng"
          >
            +
          </button>
        </div>
      </div>

      <div className="cb-reader-settings-row">
        <span className="cb-field-label">Độ rộng cột chữ</span>
        <div className="cb-reader-settings-controls">
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              type="button"
              className={
                settings.width === i ? "cb-btn cb-btn-sm" : "cb-btn cb-ghost cb-btn-sm"
              }
              aria-pressed={settings.width === i}
              onClick={() => update({ width: i })}
            >
              {WIDTH_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="cb-reader-settings-row" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="cb-btn cb-ghost cb-btn-sm" onClick={reset}>
          Đặt lại
        </button>
        <button type="button" className="cb-btn cb-btn-sm" onClick={onClose}>
          Xong
        </button>
      </div>
    </div>
  );
}
