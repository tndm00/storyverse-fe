import type { AdminLocale, MessageParams, Translation } from "./types";
import { messages, type MessageKey } from "./messages";

// Groups of server-side enum values (statuses, reasons, ...) that are shown to the admin.
export type EnumGroup = "status" | "reason" | "action" | "target" | "commentStatus" | "authorStatus";

/** Replaces {name} placeholders. A placeholder without a value is left as-is so the gap is visible. */
export function interpolate(text: string, params?: MessageParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function translate(locale: AdminLocale, key: MessageKey, params?: MessageParams): string {
  return interpolate(messages[key][locale], params);
}

/**
 * Display text for an enum value the API sends (e.g. "Pending"). The value itself is never changed,
 * only what the admin reads; an unknown value is shown as it came.
 */
export function translateEnum(
  locale: AdminLocale,
  group: EnumGroup,
  value: string | null | undefined,
): string {
  if (!value) return "";
  const entry = (messages as Record<string, Translation>)[`enum.${group}.${value}`];
  return entry ? entry[locale] : value;
}
