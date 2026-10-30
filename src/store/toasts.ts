"use client";

import { create } from "zustand";
import type { AchievementId } from "@/lib/gamification/achievements";

export interface AchievementToast {
  key: number;
  achievementId: AchievementId;
}

interface ToastStore {
  toasts: AchievementToast[];
  pushAchievements: (ids: readonly AchievementId[]) => void;
  dismiss: (key: number) => void;
}

let nextKey = 1;

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  pushAchievements: (ids) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        ...ids.map((achievementId) => ({ key: nextKey++, achievementId })),
      ].slice(-3),
    })),
  dismiss: (key) => set((state) => ({ toasts: state.toasts.filter((t) => t.key !== key) })),
}));
