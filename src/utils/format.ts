import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);

type DateInput = string | number | Date | null | undefined;
type NumberLocale = "vi" | "en";

export function formatDate(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

export function formatDateShort(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).format("YYYY-MM-DD");
}

// `locale` is only passed by the admin console (its language switch); without it the result is English,
// exactly as before.
export function fromNow(value: DateInput, locale: NumberLocale = "en"): string {
  if (!value) return "—";
  return dayjs(value).locale(locale).fromNow();
}

// Vietnamese relative time for reader-site pages (admin console stays
// English — this sets the locale on this one dayjs instance only, it does
// not touch the global default that fromNow()/admin pages rely on).
export function fromNowVi(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).locale("vi").fromNow();
}

// The reader site always uses the default ("en") formatting; the admin console passes its language.
const compactNumberFormatters: Record<NumberLocale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }),
  vi: new Intl.NumberFormat("vi", { notation: "compact", maximumFractionDigits: 1 }),
};
const numberFormatters: Record<NumberLocale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en"),
  vi: new Intl.NumberFormat("vi"),
};

// 12345 -> "12.3K" (en) / "12,3 N" (vi)
export function compactNumber(value: number | null | undefined, locale: NumberLocale = "en"): string {
  if (value == null) return "—";
  return compactNumberFormatters[locale].format(value);
}

export function formatNumber(value: number | null | undefined, locale: NumberLocale = "en"): string {
  if (value == null) return "—";
  return numberFormatters[locale].format(value);
}

// "2026-09-19" -> "2026-09-19" (a date-only string from the API; no time-zone conversion).
export function formatIsoDate(value: string | null | undefined): string {
  return value || "—";
}

// "2026-09-19" -> "19/09/2026" (a date-only string from the API; no time-zone conversion).
export function formatIsoDateVi(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// JSON.stringify does not escape "<", so a value containing the literal text
// "</script>" (e.g. a user-submitted story title) would close the script tag
// early and inject arbitrary HTML. Escaping "<" to its unicode form keeps the
// JSON valid while making that breakout impossible.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
