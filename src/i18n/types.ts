import type en from "./dictionaries/en";

/** Text for one lesson step. Optional fields are used by specific step kinds. */
export interface StepCopy {
  eyebrow?: string;
  title: string;
  paragraphs?: string[];
  prompt?: string;
  inputs?: string;
  tipTitle?: string;
  tip?: string;
  /** Button that leaves an explain step. */
  start?: string;
  /** Overrides for play-note feedback; {note} = what was played. */
  success?: string;
  wrongOctave?: string;
  wrongNote?: string;
}

export type StepCopyKey = keyof (typeof en)["steps"];

export type Dictionary = Omit<typeof en, "steps"> & { steps: Record<StepCopyKey, StepCopy> };

export const LOCALES = ["en", "mn"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tags for <html lang> and Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en", mn: "mn-MN" };
