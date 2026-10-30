"use client";

import { LOCALES } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";

const SHORT: Record<(typeof LOCALES)[number], string> = { en: "EN", mn: "МН" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.language.label}
      className={cn("relative flex rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10", className)}
    >
      {LOCALES.map((code) => {
        const selected = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={selected}
            aria-label={t.language[code]}
            title={t.language[code]}
            onClick={() => setLocale(code)}
            className={cn(
              "relative h-7 min-w-10 rounded-full px-2.5 font-mono text-xs font-medium transition-colors duration-200",
              selected
                ? "bg-white/[0.12] text-mist-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "text-mist-400 hover:text-mist-50",
            )}
          >
            {SHORT[code]}
          </button>
        );
      })}
    </div>
  );
}
