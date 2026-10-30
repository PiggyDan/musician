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
  /** Measured tap delay in ms (audio output + input), subtracted from timed exercises. */
  latencyMs: number;
  latencyCalibrated: boolean;
}

interface SettingsActions {
  setLocale: (locale: Locale) => void;
  setVolume: (volume: number) => void;
  setShowNoteNames: (value: boolean) => void;
  setShowKeyHints: (value: boolean) => void;
  dismissIosHint: () => void;
  setLatency: (ms: number | null) => void;
}

export type SettingsStore = SettingsData & SettingsActions;

export const SETTINGS_STORAGE_KEY = "musicpath:settings";

const DEFAULTS: SettingsData = {
  locale: DEFAULT_LOCALE,
  volume: 0.8,
  showNoteNames: true,
  showKeyHints: true,
  iosHintDismissed: false,
  latencyMs: 0,
  latencyCalibrated: false,
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
      setLatency: (ms) =>
        set(ms === null ? { latencyMs: 0, latencyCalibrated: false } : { latencyMs: Math.round(Math.min(300, Math.max(-100, ms))), latencyCalibrated: true }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      skipHydration: true,
      partialize: ({ locale, volume, showNoteNames, showKeyHints, iosHintDismissed, latencyMs, latencyCalibrated }) => ({
        locale,
        volume,
        showNoteNames,
        showKeyHints,
        iosHintDismissed,
        latencyMs,
        latencyCalibrated,
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
          latencyMs:
            typeof data.latencyMs === "number" && Number.isFinite(data.latencyMs)
              ? Math.min(300, Math.max(-100, data.latencyMs))
              : 0,
          latencyCalibrated: data.latencyCalibrated === true,
        };
      },
    },
  ),
);
