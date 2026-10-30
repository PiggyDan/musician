"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AchievementId } from "@/lib/gamification/achievements";
import {
  INITIAL_PROGRESS,
  applyLessonCompletion,
  applyNotesPlayed,
  sanitizeProgress,
  type CompletionResult,
  type ProgressData,
} from "@/lib/gamification/progress";
import { safeLocalStorage } from "./storage";

interface ProgressActions {
  /** Awards XP only the first time a lesson is completed. */
  completeLesson: (lessonId: string, xp: number) => Omit<CompletionResult, "next">;
  recordNotesPlayed: (count: number) => AchievementId[];
  resetProgress: () => void;
}

export type ProgressStore = ProgressData & ProgressActions;

export const PROGRESS_STORAGE_KEY = "musicpath:progress";

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_PROGRESS,

      completeLesson: (lessonId, xp) => {
        const { next, ...result } = applyLessonCompletion(pickData(get()), lessonId, xp);
        if (!result.alreadyCompleted) set(next);
        return result;
      },

      recordNotesPlayed: (count) => {
        const { next, unlocked } = applyNotesPlayed(pickData(get()), count);
        set(next);
        return unlocked;
      },

      resetProgress: () => set({ ...INITIAL_PROGRESS }),
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      // Hydrated manually after mount so server and first client render match.
      skipHydration: true,
      partialize: (state) => pickData(state),
      merge: (persisted, current) => ({ ...current, ...sanitizeProgress(persisted) }),
    },
  ),
);

function pickData(state: ProgressStore): ProgressData {
  return {
    xp: state.xp,
    currentInstrument: state.currentInstrument,
    completedLessons: state.completedLessons,
    achievements: state.achievements,
    history: state.history,
    notesPlayed: state.notesPlayed,
  };
}
