import {
  FIRST_LIGHT_LH,
  FIRST_LIGHT_RH,
  ODE_TO_JOY_PHRASE_LH,
  ODE_TO_JOY_PHRASE_RH,
  PROGRESSION_I_IV_V_LH,
} from "@/content/music/pieces";
import { MIDDLE_C } from "@/lib/music/notes";
import { melodyToTimedNotes, notationToTimedNotes } from "./timing";
import type { LessonDefinition, LessonState } from "./types";

/** "Sunrise Steps" — an original MusicPath exercise in C five-finger position. */
export const SUNRISE_STEPS = [60, 64, 62, 65, 64, 67, 65, 64, 62, 60] as const;
/** Right hand in C position: thumb (1) on C … pinky (5) on G. */
const SUNRISE_FINGERS = [1, 3, 2, 4, 3, 5, 4, 3, 2, 1] as const;

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
const LH_C_POSITION = { start: 48, whiteKeys: 8 } as const; // C3–C4
const BOTH_HANDS = { start: 48, whiteKeys: 15, fitAll: true } as const; // C3–C5, every key visible
// Reading ranges include notes on both sides of the target staff, so the
// octave really has to be read: A3–C5 for treble, A2–C4 for bass.
const TREBLE_READING = { start: 57, whiteKeys: 10, fitAll: true } as const;
const BASS_READING = { start: 45, whiteKeys: 10, fitAll: true } as const;
const LH_CHORDS = { start: 45, whiteKeys: 10, fitAll: true } as const; // A2–C4

// Chord shapes. Right hand: root position. Left hand (Lesson 10): C-position
// voicings that barely move — C = C E G, F = C F A, G = B D G.
const C_MAJOR = { name: "C", root: 60, notes: [60, 64, 67] } as const;
const F_MAJOR = { name: "F", root: 65, notes: [65, 69, 72] } as const;
const G_MAJOR = { name: "G", root: 67, notes: [67, 71, 74] } as const;
const LH_C = { name: "C", root: 48, notes: [48, 52, 55] } as const;
const LH_F_ROOT = { name: "F", root: 41, notes: [41, 45, 48] } as const;
const LH_G_ROOT = { name: "G", root: 43, notes: [43, 47, 50] } as const;
const LH_F_SHAPE = { name: "F", root: 41, notes: [48, 53, 57] } as const;
const LH_G_SHAPE = { name: "G", root: 43, notes: [47, 50, 55] } as const;

export const PIANO_LESSONS: readonly LessonDefinition[] = [
  {
    id: "piano-1",
    slug: "1",
    instrument: "piano",
    order: 1,
    xp: 10,
    estimatedMinutes: 2,
    i18nKey: "l1",
    unit: 1,
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
    unit: 1,
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
    unit: 1,
    playable: true,
    steps: [
      { kind: "explain", copy: "l3Intro", diagram: "five-finger" },
      { kind: "play-sequence", copy: "l3Guided", notes: SUNRISE_STEPS, guide: true, fingers: SUNRISE_FINGERS, keyboard: C_POSITION },
      { kind: "play-sequence", copy: "l3Memory", notes: SUNRISE_STEPS, guide: false, fingers: SUNRISE_FINGERS, keyboard: C_POSITION },
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
    unit: 1,
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
    unit: 1,
    playable: true,
    completesUnit: true,
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

  // ── Unit 2 · Reading & Both Hands ─────────────────────────────────────────
  {
    id: "piano-6",
    slug: "6",
    instrument: "piano",
    order: 6,
    xp: 15,
    estimatedMinutes: 6,
    i18nKey: "l6",
    unit: 2,
    playable: true,
    steps: [
      { kind: "explain", copy: "l6Intro", diagram: "treble-staff" },
      { kind: "read-notes", copy: "l6ReadA", clef: "treble", notes: [60, 64, 67, 62, 65, 67, 64, 60], keyboard: TREBLE_READING },
      { kind: "read-notes", copy: "l6ReadB", clef: "treble", notes: [69, 71, 72, 67, 65, 69, 62, 71], keyboard: TREBLE_READING },
    ],
  },
  {
    id: "piano-7",
    slug: "7",
    instrument: "piano",
    order: 7,
    xp: 15,
    estimatedMinutes: 6,
    i18nKey: "l7",
    unit: 2,
    playable: true,
    steps: [
      { kind: "explain", copy: "l7Intro", diagram: "bass-staff" },
      { kind: "read-notes", copy: "l7Read", clef: "bass", notes: [48, 55, 52, 50, 53, 48, 55, 52], keyboard: BASS_READING },
      { kind: "explain", copy: "l7Hand", diagram: "left-hand" },
      {
        kind: "play-sequence",
        copy: "l7Walk",
        notes: [48, 50, 52, 53, 55, 53, 52, 50, 48],
        guide: true,
        fingers: [5, 4, 3, 2, 1, 2, 3, 4, 5],
        keyboard: LH_C_POSITION,
      },
      {
        kind: "play-sequence",
        copy: "l7Memory",
        notes: [48, 52, 55, 52, 50, 48],
        guide: false,
        fingers: [5, 3, 1, 3, 4, 5],
        keyboard: LH_C_POSITION,
      },
    ],
  },
  {
    id: "piano-8",
    slug: "8",
    instrument: "piano",
    order: 8,
    xp: 20,
    estimatedMinutes: 6,
    i18nKey: "l8",
    unit: 2,
    playable: true,
    steps: [
      { kind: "explain", copy: "l8Intro", diagram: "triads" },
      { kind: "play-chords", copy: "l8Right", clef: "treble", chords: [C_MAJOR, F_MAJOR, G_MAJOR, C_MAJOR], keyboard: { start: 60, whiteKeys: 10, fitAll: true } },
      { kind: "play-chords", copy: "l8Left", clef: "bass", chords: [LH_C, LH_F_ROOT, LH_G_ROOT, LH_C], keyboard: { start: 41, whiteKeys: 10, fitAll: true } },
    ],
  },
  {
    id: "piano-9",
    slug: "9",
    instrument: "piano",
    order: 9,
    xp: 25,
    estimatedMinutes: 7,
    i18nKey: "l9",
    unit: 2,
    playable: true,
    steps: [
      { kind: "explain", copy: "l9Intro" },
      {
        kind: "play-sequence",
        copy: "l9Together",
        notes: [[48, 60], 64, 67, [55, 65], 64, 62, [48, 64], 65, 67, 64, [55, 62], [48, 60]],
        guide: true,
        keyboard: BOTH_HANDS,
      },
      {
        kind: "play-timed",
        copy: "l9Song",
        mode: "song",
        bpm: 66,
        beatsPerBar: 4,
        countInBeats: 4,
        notes: notationToTimedNotes(FIRST_LIGHT_RH, FIRST_LIGHT_LH),
        passRatio: 0.7,
        keyboard: BOTH_HANDS,
      },
    ],
  },
  {
    id: "piano-10",
    slug: "10",
    instrument: "piano",
    order: 10,
    xp: 25,
    estimatedMinutes: 8,
    i18nKey: "l10",
    unit: 2,
    playable: true,
    completesUnit: true,
    steps: [
      { kind: "explain", copy: "l10Intro", diagram: "lh-chords" },
      { kind: "play-chords", copy: "l10Shapes", clef: "bass", chords: [LH_C, LH_F_SHAPE, LH_G_SHAPE, LH_C], keyboard: LH_CHORDS },
      {
        kind: "play-timed",
        copy: "l10Progression",
        mode: "song",
        bpm: 72,
        beatsPerBar: 4,
        countInBeats: 4,
        notes: notationToTimedNotes(PROGRESSION_I_IV_V_LH).map((n) => ({ ...n, hand: "left" as const })),
        passRatio: 0.7,
        keyboard: LH_CHORDS,
      },
      {
        kind: "play-timed",
        copy: "l10Ode",
        mode: "song",
        bpm: 66,
        beatsPerBar: 4,
        countInBeats: 4,
        notes: notationToTimedNotes(ODE_TO_JOY_PHRASE_RH, ODE_TO_JOY_PHRASE_LH),
        passRatio: 0.7,
        keyboard: { start: 47, whiteKeys: 13, fitAll: true },
      },
    ],
  },
];

export const UNITS = [1, 2] as const;

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
