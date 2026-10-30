"use client";

import { useSettingsStore } from "@/store/settings";
import { DICTIONARIES, LOCALE_TAGS, type Dictionary, type Locale } from "./index";

export interface I18n {
  locale: Locale;
  /** BCP 47 tag for Intl APIs. */
  tag: string;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

export function useI18n(): I18n {
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  return { locale, tag: LOCALE_TAGS[locale], t: DICTIONARIES[locale], setLocale };
}
