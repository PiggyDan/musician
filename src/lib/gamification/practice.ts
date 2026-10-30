/**
 * Daily practice tracking. A "practice minute" is a calendar minute in which
 * the learner played at least one note — an honest measure of active playing
 * that idle tabs can't inflate. Days use the learner's local calendar.
 */

export const GOAL_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_GOAL = 5;
/** Days of history kept (older days are pruned). */
export const HISTORY_DAYS = 120;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar day, e.g. "2026-10-30". */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local calendar minute, e.g. "2026-10-30T14:05". */
export function minuteKey(date: Date): string {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The day `offset` days before `date` (local, DST-safe). */
export function shiftDays(date: Date, offset: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  d.setDate(d.getDate() - offset);
  return d;
}

export interface PracticeLog {
  practiceMinutes: Record<string, number>;
  lastActiveMinute: string | null;
}

/** Adds the current minute once, no matter how many notes are played in it. */
export function addPracticeMinute(log: PracticeLog, now: Date): PracticeLog {
  const minute = minuteKey(now);
  if (log.lastActiveMinute === minute) return log;
  const day = dateKey(now);
  const cutoff = dateKey(shiftDays(now, HISTORY_DAYS));
  const practiceMinutes: Record<string, number> = {};
  for (const [key, value] of Object.entries(log.practiceMinutes)) if (key > cutoff) practiceMinutes[key] = value;
  practiceMinutes[day] = (practiceMinutes[day] ?? 0) + 1;
  return { practiceMinutes, lastActiveMinute: minute };
}

/**
 * Consecutive days (ending today) on which the goal was met. If today's goal
 * isn't met yet, the streak still counts up to yesterday — it only breaks once
 * a whole day passes without meeting the goal.
 */
export function currentStreak(minutes: Readonly<Record<string, number>>, goal: number, today: Date): number {
  let offset = (minutes[dateKey(today)] ?? 0) >= goal ? 0 : 1;
  let streak = 0;
  while ((minutes[dateKey(shiftDays(today, offset))] ?? 0) >= goal) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

/** Minutes for each of the last `days` days, oldest first (for a small chart). */
export function recentDays(minutes: Readonly<Record<string, number>>, today: Date, days = 14): { key: string; minutes: number }[] {
  return Array.from({ length: days }, (_, i) => {
    const key = dateKey(shiftDays(today, days - 1 - i));
    return { key, minutes: minutes[key] ?? 0 };
  });
}
