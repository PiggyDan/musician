import type { InstrumentId } from "@/content/instruments";
import { ACHIEVEMENTS, type AchievementId } from "./achievements";

export interface LessonCompletion {
  completedAt: string;
  xpAwarded: number;
}

export type HistoryEvent =
  | { type: "lesson-completed"; lessonId: string; xp: number; at: string }
  | { type: "achievement-unlocked"; achievementId: AchievementId; at: string };

export interface ProgressData {
  xp: number;
  currentInstrument: InstrumentId;
  completedLessons: Record<string, LessonCompletion>;
  achievements: Partial<Record<AchievementId, string>>;
  /** Most recent first, capped at HISTORY_LIMIT. */
  history: HistoryEvent[];
  /** Lifetime notes played in the studio and lessons, for achievements. */
  notesPlayed: number;
}

export const HISTORY_LIMIT = 50;

export const INITIAL_PROGRESS: ProgressData = {
  xp: 0,
  currentInstrument: "piano",
  completedLessons: {},
  achievements: {},
  history: [],
  notesPlayed: 0,
};

export interface CompletionResult {
  next: ProgressData;
  /** XP actually granted — 0 when the lesson was already complete. */
  xpAwarded: number;
  alreadyCompleted: boolean;
  unlockedAchievements: AchievementId[];
}

/**
 * Marks a lesson complete. Idempotent: a lesson grants XP exactly once, no
 * matter how many times it is replayed or how many times this is called.
 */
export function applyLessonCompletion(
  state: ProgressData,
  lessonId: string,
  xp: number,
  now: Date = new Date(),
): CompletionResult {
  if (state.completedLessons[lessonId]) {
    return { next: state, xpAwarded: 0, alreadyCompleted: true, unlockedAchievements: [] };
  }

  const at = now.toISOString();
  const award = Math.max(0, Math.floor(xp));
  const withLesson: ProgressData = {
    ...state,
    xp: state.xp + award,
    completedLessons: {
      ...state.completedLessons,
      [lessonId]: { completedAt: at, xpAwarded: award },
    },
    history: [{ type: "lesson-completed" as const, lessonId, xp: award, at }, ...state.history],
  };

  const { next, unlocked } = applyAchievements(withLesson, now);
  return { next, xpAwarded: award, alreadyCompleted: false, unlockedAchievements: unlocked };
}

export function applyNotesPlayed(
  state: ProgressData,
  count: number,
  now: Date = new Date(),
): { next: ProgressData; unlocked: AchievementId[] } {
  if (count <= 0) return { next: state, unlocked: [] };
  return applyAchievements({ ...state, notesPlayed: state.notesPlayed + count }, now);
}

/** Unlocks any newly satisfied achievements and records them in history. */
export function applyAchievements(
  state: ProgressData,
  now: Date = new Date(),
): { next: ProgressData; unlocked: AchievementId[] } {
  const unlocked = ACHIEVEMENTS.filter(
    (achievement) => !state.achievements[achievement.id] && achievement.isUnlocked(state),
  ).map((achievement) => achievement.id);

  if (unlocked.length === 0) {
    return { next: { ...state, history: state.history.slice(0, HISTORY_LIMIT) }, unlocked };
  }

  const at = now.toISOString();
  const achievements = { ...state.achievements };
  for (const id of unlocked) achievements[id] = at;
  const events: HistoryEvent[] = unlocked.map((achievementId) => ({
    type: "achievement-unlocked",
    achievementId,
    at,
  }));

  return {
    next: {
      ...state,
      achievements,
      history: [...events, ...state.history].slice(0, HISTORY_LIMIT),
    },
    unlocked,
  };
}

/** Defensive parse of persisted data — corrupt or partial storage never crashes the app. */
export function sanitizeProgress(raw: unknown): ProgressData {
  if (!raw || typeof raw !== "object") return INITIAL_PROGRESS;
  const data = raw as Partial<ProgressData>;
  return {
    xp: typeof data.xp === "number" && Number.isFinite(data.xp) ? Math.max(0, data.xp) : 0,
    currentInstrument: data.currentInstrument === "piano" ? "piano" : INITIAL_PROGRESS.currentInstrument,
    completedLessons:
      data.completedLessons && typeof data.completedLessons === "object"
        ? data.completedLessons
        : {},
    achievements:
      data.achievements && typeof data.achievements === "object" ? data.achievements : {},
    history: Array.isArray(data.history) ? data.history.slice(0, HISTORY_LIMIT) : [],
    notesPlayed:
      typeof data.notesPlayed === "number" && Number.isFinite(data.notesPlayed)
        ? Math.max(0, data.notesPlayed)
        : 0,
  };
}
