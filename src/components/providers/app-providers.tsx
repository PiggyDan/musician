"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { audioEngine } from "@/audio/engine";
import { LOCALE_TAGS } from "@/i18n/types";
import { rehydrateStores, useStoresHydrated } from "@/store/hydration";
import { PROGRESS_STORAGE_KEY, useProgressStore } from "@/store/progress";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toasts";
import { AchievementToasts } from "@/components/ui/achievement-toasts";

const NOTE_FLUSH_MS = 2500;

export function AppProviders({ children }: { children: ReactNode }) {
  const hydrated = useStoresHydrated();
  const locale = useSettingsStore((s) => s.locale);
  const volume = useSettingsStore((s) => s.volume);

  // Load saved progress/settings after mount, and follow writes from other tabs.
  useEffect(() => {
    void rehydrateStores();
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROGRESS_STORAGE_KEY || event.key === SETTINGS_STORAGE_KEY) {
        void rehydrateStores();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Count notes played anywhere (batched so we don't write storage per keypress).
  useEffect(() => {
    if (!hydrated) return;
    let pending = 0;
    const flush = () => {
      if (pending === 0) return;
      const unlocked = useProgressStore.getState().recordNotesPlayed(pending);
      pending = 0;
      if (unlocked.length > 0) useToastStore.getState().pushAchievements(unlocked);
    };
    const unsubscribe = audioEngine.subscribeNotes((event) => {
      if (event.type !== "on" || event.source === "demo") return;
      // First note ever → flush immediately so "First Sound" appears right away.
      const isFirst = useProgressStore.getState().notesPlayed === 0 && pending === 0;
      pending += 1;
      if (isFirst) flush();
    });
    const interval = window.setInterval(flush, NOTE_FLUSH_MS);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("pagehide", flush);
    };
  }, [hydrated]);

  return (
    <MotionConfig reducedMotion="user">
      {children}
      <AchievementToasts />
    </MotionConfig>
  );
}
