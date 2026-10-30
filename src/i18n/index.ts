import en from "./dictionaries/en";
import mn from "./dictionaries/mn";
import type { Dictionary, Locale } from "./types";

export * from "./types";

/** To add a language: create dictionaries/<code>.ts typed as Dictionary and register it here. */
export const DICTIONARIES: Record<Locale, Dictionary> = { en, mn };

/** Fills {placeholders}: format("Level {level}", { level: 3 }) → "Level 3". */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
