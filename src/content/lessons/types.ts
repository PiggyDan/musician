import type { InstrumentId } from "@/content/instruments";
import type { StepCopyKey } from "@/i18n/types";
import type { NoteLetter } from "@/lib/music/notes";
import type { Midi } from "@/lib/music/notes";

export type DiagramKind = "key-pattern" | "letters" | "five-finger" | "rhythm";

/** A note with a position in musical time. Beats are counted from 0. */
export interface TimedNote {
  midi: Midi;
  beat: number;
  beats: number;
}

/** Visible keyboard range for a step: first white key and how many white keys to show (max). */
export interface KeyboardRange {
  start: Midi;
  whiteKeys: number;
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
  | (StepBase & { kind: "explain"; diagram?: DiagramKind })
  /** Play one exact pitch (octave matters). */
  | (StepBase & { kind: "play-note"; target: Midi; keyboard?: KeyboardRange })
  /** Play each letter in turn, in any octave. */
  | (StepBase & { kind: "find-notes"; letters: readonly NoteLetter[]; keyboard?: KeyboardRange })
  /** A key glows; the learner names it. */
  | (StepBase & { kind: "name-notes"; keys: readonly Midi[]; keyboard?: KeyboardRange })
  /** Play notes in order; `guide` lights the next key. */
  | (StepBase & { kind: "play-sequence"; notes: readonly Midi[]; guide: boolean; keyboard?: KeyboardRange })
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
  i18nKey: "l1" | "l2" | "l3" | "l4" | "l5";
  /** Coming-soon lessons are listed but not playable yet. */
  playable: boolean;
  steps: readonly LessonStep[];
  /** Completing this lesson finishes its course. */
  completesCourse?: boolean;
}

export type LessonState = "completed" | "available" | "locked" | "coming-soon";
