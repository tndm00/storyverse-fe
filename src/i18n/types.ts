// Languages the admin console supports. Adding one means adding it here and a value in every message.
export const ADMIN_LOCALES = ["vi", "en"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

// One message: the text in every supported language. Leaving a language out is a compile error.
export type Translation = Record<AdminLocale, string>;

export type MessageParams = Record<string, string | number>;
