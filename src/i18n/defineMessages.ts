import type { Translation } from "./types";

// Identity helper that only exists to make the compiler check every entry has ALL languages,
// while still keeping each key as a literal type (that is what makes t("...") type-safe).
export function defineMessages<T extends Record<string, Translation>>(messages: T): T {
  return messages;
}
