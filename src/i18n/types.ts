import type en from "./dictionaries/en";

export type Dictionary = typeof en;

export const LOCALES = ["en", "mn"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tags for <html lang> and Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en", mn: "mn-MN" };
