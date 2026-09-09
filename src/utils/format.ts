import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type DateInput = string | number | Date | null | undefined;

export function formatDate(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

export function formatDateShort(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).format("YYYY-MM-DD");
}

export function fromNow(value: DateInput): string {
  if (!value) return "—";
  return dayjs(value).fromNow();
}

// 12345 -> "12.3K"
export function compactNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en").format(value);
}

export function truncate(text: string | null | undefined, max = 120): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
