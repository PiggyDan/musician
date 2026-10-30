"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/types";
import { safeLocalStorage } from "./storage";

interface SettingsData {
  locale: Locale;
  volume: number;
  showNoteNames: boolean;
  showKeyHints: boolean;
  iosHintDismissed: boolean;
}

interface SettingsActions {
  setLocale: (locale: Locale) => void;
  setVolume: (volume: number) => void;
  setShowNoteNames: (value: boolean) => void;
  setShowKeyHints: (value: boolean) => void;
  dismissIosHint: () => void;
}

export type SettingsStore = SettingsData & SettingsActions;

export const SETTINGS_STORAGE_KEY = "musicpath:settings";

const DEFAULTS: SettingsData = {
  locale: DEFAULT_LOCALE,
  volume: 0.8,
  showNoteNames: true,
  showKeyHints: true,
  iosHintDismissed: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setLocale: (locale) => set({ locale }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setShowNoteNames: (showNoteNames) => set({ showNoteNames }),
      setShowKeyHints: (showKeyHints) => set({ showKeyHints }),
      dismissIosHint: () => set({ iosHintDismissed: true }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      partialize: ({ locale, volume, showNoteNames, showKeyHints, iosHintDismissed }) => ({
        locale,
        volume,
        showNoteNames,
        showKeyHints,
        iosHintDismissed,
      }),
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as Partial<SettingsData>;
        return {
          ...current,
          locale: isLocale(data.locale) ? data.locale : current.locale,
          volume:
            typeof data.volume === "number" && Number.isFinite(data.volume)
              ? Math.min(1, Math.max(0, data.volume))
              : current.volume,
          showNoteNames:
            typeof data.showNoteNames === "boolean" ? data.showNoteNames : current.showNoteNames,
          showKeyHints:
            typeof data.showKeyHints === "boolean" ? data.showKeyHints : current.showKeyHints,
          iosHintDismissed: data.iosHintDismissed === true,
        };
      },
    },
  ),
);
