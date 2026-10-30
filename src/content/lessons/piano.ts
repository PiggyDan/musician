import { MIDDLE_C } from "@/lib/music/notes";
import { melodyToTimedNotes } from "./timing";
import type { LessonDefinition, LessonState } from "./types";

/** "Sunrise Steps" — an original MusicPath exercise in C five-finger position. */
export const SUNRISE_STEPS = [60, 64, 62, 65, 64, 67, 65, 64, 62, 60] as const;

/**
 * "First Light" — an original MusicPath beginner piece (4/4, 16 beats).
 * Each entry is [midi, beats].
 */
export const FIRST_LIGHT = melodyToTimedNotes([
  [60, 1], [64, 1], [67, 2],
  [65, 1], [64, 1], [62, 2],
  [64, 1], [65, 1], [67, 1], [64, 1],
  [62, 2], [60, 2],
]);

const C_POSITION = { start: 60, whiteKeys: 8 } as const; // C4–C5: big keys on phones

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
    steps: [
      { kind: "explain", copy: "l1Intro", diagram: "key-pattern" },
      { kind: "play-note", copy: "l1Play", target: MIDDLE_C },
    ],
  },
  {
    id: "piano-2",
    slug: "2",
    instrument: "piano",
    order: 2,
    xp: 15,
    estimatedMinutes: 4,
    i18nKey: "l2",
    playable: true,
    steps: [
      { kind: "explain", copy: "l2Intro", diagram: "letters" },
      { kind: "find-notes", copy: "l2Find", letters: ["C", "D", "E", "F", "G", "A", "B"] },
      { kind: "name-notes", copy: "l2Name", keys: [64, 69, 65, 59, 67, 62] },
    ],
  },
  {
    id: "piano-3",
    slug: "3",
    instrument: "piano",
    order: 3,
    xp: 15,
    estimatedMinutes: 4,
    i18nKey: "l3",
    playable: true,
    steps: [
      { kind: "explain", copy: "l3Intro", diagram: "five-finger" },
      { kind: "play-sequence", copy: "l3Guided", notes: SUNRISE_STEPS, guide: true, keyboard: C_POSITION },
      { kind: "play-sequence", copy: "l3Memory", notes: SUNRISE_STEPS, guide: false, keyboard: C_POSITION },
    ],
  },
  {
    id: "piano-4",
    slug: "4",
    instrument: "piano",
    order: 4,
    xp: 20,
    estimatedMinutes: 5,
    i18nKey: "l4",
    playable: true,
    steps: [
      { kind: "explain", copy: "l4Intro", diagram: "rhythm" },
      {
        kind: "play-timed",
        copy: "l4Steady",
        mode: "rhythm",
        bpm: 80,
        beatsPerBar: 4,
        countInBeats: 4,
        notes: melodyToTimedNotes([[60, 1], [60, 1], [60, 1], [60, 1], [60, 1], [60, 1], [60, 1], [60, 1]]),
        passRatio: 0.75,
        keyboard: C_POSITION,
      },
      {
        kind: "play-timed",
        copy: "l4Halves",
        mode: "rhythm",
        bpm: 80,
        beatsPerBar: 4,
        countInBeats: 4,
        notes: melodyToTimedNotes([[60, 1], [60, 1], [60, 2], [60, 1], [60, 1], [60, 2]]),
        passRatio: 0.75,
        keyboard: C_POSITION,
      },
    ],
  },
  {
    id: "piano-5",
    slug: "5",
    instrument: "piano",
    order: 5,
    xp: 25,
    estimatedMinutes: 6,
    i18nKey: "l5",
    playable: true,
    completesCourse: true,
    steps: [
      { kind: "explain", copy: "l5Intro" },
      {
        kind: "play-timed",
        copy: "l5Song",
        mode: "song",
        bpm: 72,
        beatsPerBar: 4,
        countInBeats: 4,
        notes: FIRST_LIGHT,
        passRatio: 0.7,
        keyboard: C_POSITION,
      },
    ],
  },
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
