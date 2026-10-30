"use client";

import { PIANO_LESSONS } from "@/content/lessons/piano";
import { getLevelInfo } from "@/lib/gamification/levels";
import { useProgressStore } from "@/store/progress";

export function useProgressSummary() {
  const xp = useProgressStore((s) => s.xp);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const completedPiano = PIANO_LESSONS.filter((lesson) => completedLessons[lesson.id]).length;
  return {
    xp,
    completedLessons,
    completedPiano,
    totalPiano: PIANO_LESSONS.length,
    levelInfo: getLevelInfo(xp),
  };
}
