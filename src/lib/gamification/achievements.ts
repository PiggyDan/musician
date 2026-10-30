import type { ProgressData } from "./progress";

export type AchievementId =
  | "first-note"
  | "hundred-notes"
  | "first-lesson"
  | "middle-c"
  | "first-melody"
  | "on-the-beat"
  | "foundations-complete"
  | "staff-reader"
  | "chord-builder"
  | "both-hands"
  | "streak-3"
  | "streak-7";

export interface AchievementDefinition {
  id: AchievementId;
  /** Key into `dictionary.achievements`. */
  i18nKey: AchievementId;
  isUnlocked: (state: ProgressData) => boolean;
}

/** Add new achievements here; they are evaluated after every progress change. */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: "first-note", i18nKey: "first-note", isUnlocked: (s) => s.notesPlayed >= 1 },
  { id: "hundred-notes", i18nKey: "hundred-notes", isUnlocked: (s) => s.notesPlayed >= 100 },
  {
    id: "first-lesson",
    i18nKey: "first-lesson",
    isUnlocked: (s) => Object.keys(s.completedLessons).length >= 1,
  },
  { id: "middle-c", i18nKey: "middle-c", isUnlocked: (s) => Boolean(s.completedLessons["piano-1"]) },
  { id: "first-melody", i18nKey: "first-melody", isUnlocked: (s) => Boolean(s.completedLessons["piano-3"]) },
  { id: "on-the-beat", i18nKey: "on-the-beat", isUnlocked: (s) => Boolean(s.completedLessons["piano-4"]) },
  {
    id: "foundations-complete",
    i18nKey: "foundations-complete",
    isUnlocked: (s) => Boolean(s.completedLessons["piano-5"]),
  },
  { id: "staff-reader", i18nKey: "staff-reader", isUnlocked: (s) => Boolean(s.completedLessons["piano-6"]) },
  { id: "chord-builder", i18nKey: "chord-builder", isUnlocked: (s) => Boolean(s.completedLessons["piano-8"]) },
  { id: "both-hands", i18nKey: "both-hands", isUnlocked: (s) => Boolean(s.completedLessons["piano-10"]) },
  { id: "streak-3", i18nKey: "streak-3", isUnlocked: (s) => s.bestStreak >= 3 },
  { id: "streak-7", i18nKey: "streak-7", isUnlocked: (s) => s.bestStreak >= 7 },
];
