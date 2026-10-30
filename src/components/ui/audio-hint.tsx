"use client";

import { BellOff, Volume2, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useAudioStatus } from "@/audio/hooks";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { useSettingsStore } from "@/store/settings";

/** iPhone, iPad, and iPadOS (which reports itself as a Mac with touch). */
function detectIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

const noopSubscribe = () => () => {};

export function useIsIos(): boolean {
  return useSyncExternalStore(noopSubscribe, detectIos, () => false);
}

/**
 * Explains why there might be no sound: audio not started yet, an error, or —
 * on iPhone — the hardware silent switch, which web pages cannot detect.
 */
export function AudioHint({ className, iosOnly = false }: { className?: string; iosOnly?: boolean }) {
  const { t } = useI18n();
  const status = useAudioStatus();
  const isIos = useIsIos();
  const dismissed = useSettingsStore((s) => s.iosHintDismissed);
  const dismiss = useSettingsStore((s) => s.dismissIosHint);

  if (status === "ready") {
    if (!isIos || dismissed) return null;
    return (
      <div
        className={cn(
          "mx-auto flex max-w-lg items-start gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs text-mist-200 ring-1 ring-white/10",
          className,
        )}
      >
        <BellOff className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <p className="flex-1">{t.audio.iosSilent}</p>
        <button
          type="button"
          onClick={dismiss}
          className="-m-1 inline-flex items-center gap-1 rounded-full p-1 text-mist-400 hover:text-mist-50"
        >
          <span className="sr-only sm:not-sr-only">{t.audio.dismiss}</span>
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  if (iosOnly) return null;
  const isProblem = status === "error" || status === "unsupported";
  return (
    <p
      className={cn(
        "flex items-center justify-center gap-2 text-center text-xs",
        isProblem ? "text-warn" : "text-mist-500",
        className,
      )}
    >
      <Volume2 className="size-3.5 shrink-0" aria-hidden />
      {t.audio[status]}
    </p>
  );
}
