import type { InstrumentId } from "@/content/instruments";
import type { Dictionary, StepCopyKey } from "@/i18n/types";
import type { NoteLetter } from "@/lib/music/notes";
import type { Midi } from "@/lib/music/notes";

export type DiagramKind =
  | "key-pattern"
  | "letters"
  | "five-finger"
  | "rhythm"
  | "treble-staff"
  | "bass-staff"
  | "left-hand"
  | "triads"
  | "lh-chords"
  /** A playable picture of the lesson's instrument (fretboard / harmonica). */
  | "instrument";

export type Clef = "treble" | "bass";
export type Hand = "right" | "left";

/** A note with a position in musical time. Beats are counted from 0. */
export interface TimedNote {
  midi: Midi;
  beat: number;
  beats: number;
  hand?: Hand;
}

/** A chord to play, with its letter name and root (for "add the third" feedback). */
export interface ChordTarget {
  /** e.g. "C", "F", "G" — major chords unless the name says otherwise. */
  name: string;
  /** MIDI of any octave of the root, e.g. 65 for F. */
  root: Midi;
  notes: readonly Midi[];
}

/** Visible keyboard range for a step: first white key and how many white keys to show (max). */
export interface KeyboardRange {
  start: Midi;
  whiteKeys: number;
  /** Show every key even on narrow screens (smaller keys) — needed for two hands. */
  fitAll?: boolean;
}

interface StepBase {
  /** Key into `dictionary.steps` for the step's title, text and hints. */
  copy: StepCopyKey;
}

/**
 * The building blocks of every lesson. A lesson is just an ordered list of
 * these; each kind has one generic component, so new lessons need no new UI.
 */
export type LessonStep =
  | (StepBase & { kind: "explain"; diagram?: DiagramKind; instrument?: Exclude<InstrumentId, "piano"> })
  /** Play one exact pitch (octave matters). */
  | (StepBase & { kind: "play-note"; target: Midi; keyboard?: KeyboardRange })
  /** Play each letter in turn, in any octave. */
  | (StepBase & { kind: "find-notes"; letters: readonly NoteLetter[]; keyboard?: KeyboardRange })
  /** A key glows; the learner names it. */
  | (StepBase & { kind: "name-notes"; keys: readonly Midi[]; keyboard?: KeyboardRange })
  /** A note appears on a staff; the learner plays that exact pitch. */
  | (StepBase & { kind: "read-notes"; clef: Clef; notes: readonly Midi[]; keyboard?: KeyboardRange })
  /** Hold each chord (all notes together). */
  | (StepBase & { kind: "play-chords"; clef: Clef; chords: readonly ChordTarget[]; keyboard?: KeyboardRange })
  /**
   * Play notes in order; an entry with several notes must be held together
   * (hands together / chords). `guide` lights the next key(s); `fingers`
   * shows the correct finger number for each entry.
   */
  | (StepBase & {
      kind: "play-sequence";
      notes: readonly (Midi | readonly Midi[])[];
      guide: boolean;
      fingers?: readonly (number | string)[];
      keyboard?: KeyboardRange;
      /** Play on this instrument's pad instead of the piano. */
      instrument?: Exclude<InstrumentId, "piano">;
    })
  /** Play in time with a metronome. Rhythm ignores pitch; song checks pitch and timing. */
  | (StepBase & {
      kind: "play-timed";
      mode: "rhythm" | "song";
      bpm: number;
      beatsPerBar: number;
      countInBeats: number;
      notes: readonly TimedNote[];
      /** Share of notes that must land on time to pass (0–1). */
      passRatio: number;
      keyboard?: KeyboardRange;
    });

export type LessonStepKind = LessonStep["kind"];

export interface LessonDefinition {
  /** Globally unique and stable — used as the progress storage key. */
  id: string;
  /** URL segment under /learn/<instrument>/lesson/. */
  slug: string;
  instrument: InstrumentId;
  order: number;
  xp: number;
  estimatedMinutes: number;
  /** Key into `dictionary.lessons`. */
  i18nKey: keyof Dictionary["lessons"];
  /** Course unit: 1 = Piano Foundations, 2 = Reading & Both Hands. */
  unit: 1 | 2;
  /** Coming-soon lessons are listed but not playable yet. */
  playable: boolean;
  steps: readonly LessonStep[];
  /** Completing this lesson finishes its unit. */
  completesUnit?: boolean;
}

export type LessonState = "completed" | "available" | "locked" | "coming-soon";
