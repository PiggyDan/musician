import { MIDDLE_C } from "@/lib/music/notes";
import type { LessonDefinition, LessonState } from "./types";

export const PIANO_LESSONS: readonly LessonDefinition[] = [
  {
    id: "piano-1",
    slug: "1",
    instrument: "piano",
    order: 1,
    xp: 10,
    estimatedMinutes: 2,
    i18nKey: "l1",
    playable: true,
    task: { kind: "play-note", target: MIDDLE_C },
  },
  { id: "piano-2", slug: "2", instrument: "piano", order: 2, xp: 15, estimatedMinutes: 4, i18nKey: "l2", playable: false },
  { id: "piano-3", slug: "3", instrument: "piano", order: 3, xp: 15, estimatedMinutes: 4, i18nKey: "l3", playable: false },
  { id: "piano-4", slug: "4", instrument: "piano", order: 4, xp: 20, estimatedMinutes: 5, i18nKey: "l4", playable: false },
  { id: "piano-5", slug: "5", instrument: "piano", order: 5, xp: 25, estimatedMinutes: 6, i18nKey: "l5", playable: false },
];

export function getPianoLesson(slug: string): LessonDefinition | undefined {
  return PIANO_LESSONS.find((lesson) => lesson.slug === slug);
}

/**
 * A lesson unlocks when the one before it is complete. Lessons whose content
 * isn't built yet report "coming-soon" so the UI never links to an empty page.
 */
export function getLessonState(
  lesson: LessonDefinition,
  completed: Readonly<Record<string, unknown>>,
  lessons: readonly LessonDefinition[] = PIANO_LESSONS,
): LessonState {
  if (completed[lesson.id]) return "completed";
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const unlocked = !previous || Boolean(completed[previous.id]);
  if (!lesson.playable) return "coming-soon";
  return unlocked ? "available" : "locked";
}

/** The first lesson the learner can play now, or undefined when nothing is open. */
export function getNextLesson(
  completed: Readonly<Record<string, unknown>>,
  lessons: readonly LessonDefinition[] = PIANO_LESSONS,
): LessonDefinition | undefined {
  return lessons.find((lesson) => getLessonState(lesson, completed, lessons) === "available");
}
