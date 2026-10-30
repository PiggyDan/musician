import { noteNameToMidi, type Midi } from "@/lib/music/notes";

/**
 * Compact notation used by the catalog and lessons, e.g.
 *   "E4:q E4:q F4:q G4:q | D4:q. C4:8 C4:h"      (melody)
 *   "C3+E3+G3:w | B2+D3+G3:w"                     (block chords)
 * Tokens are PITCHES:DURATION. PITCHES is one note name (C4, F#5, Bb3), several
 * joined with "+" for a chord, or "r" for a rest. DURATION is w, h, q, 8 or 16,
 * with an optional trailing "." for dotted. "|" separates measures.
 */

export type DurationCode = "w" | "h" | "q" | "8" | "16";

/** Duration of each code in sixteenth notes (MusicXML divisions = 4 per quarter). */
const SIXTEENTHS: Record<DurationCode, number> = { w: 16, h: 8, q: 4, "8": 2, "16": 1 };

export const MUSICXML_TYPES: Record<DurationCode, string> = {
  w: "whole",
  h: "half",
  q: "quarter",
  "8": "eighth",
  "16": "16th",
};

export interface Pitch {
  midi: Midi;
  step: string;
  alter: number;
  octave: number;
}

export interface NotationEvent {
  /** Empty for rests; several for a chord (low → high as written). */
  pitches: Pitch[];
  code: DurationCode;
  dotted: boolean;
  /** Length in sixteenth notes. */
  sixteenths: number;
  measure: number;
}

export interface ParsedMelody {
  events: NotationEvent[];
  /** Events grouped by measure, in order. */
  measures: NotationEvent[][];
}

const PITCH_RE = /^([A-G])(#|b)?(-?\d)$/;
const TOKEN_RE = /^(r|[A-G](?:#|b)?-?\d(?:\+[A-G](?:#|b)?-?\d)*):(w|h|q|8|16)(\.)?$/;

function parsePitch(name: string): Pitch {
  const match = PITCH_RE.exec(name);
  const midi = noteNameToMidi(name);
  if (!match || midi === null) throw new Error(`Invalid pitch "${name}"`);
  const [, step, accidental, octave] = match;
  return { midi, step, alter: accidental === "#" ? 1 : accidental === "b" ? -1 : 0, octave: Number(octave) };
}

export function parseMelody(source: string): ParsedMelody {
  const measures: NotationEvent[][] = [];
  const bars = source.split("|").map((bar) => bar.trim()).filter(Boolean);

  bars.forEach((bar, measure) => {
    const events: NotationEvent[] = [];
    for (const token of bar.split(/\s+/)) {
      const match = TOKEN_RE.exec(token);
      if (!match) throw new Error(`Invalid notation token "${token}" in measure ${measure + 1}`);
      const [, pitchPart, code, dot] = match;
      const duration = code as DurationCode;
      const dotted = Boolean(dot);
      const pitches = pitchPart === "r" ? [] : pitchPart.split("+").map(parsePitch);
      events.push({ pitches, code: duration, dotted, sixteenths: SIXTEENTHS[duration] * (dotted ? 1.5 : 1), measure });
    }
    measures.push(events);
  });

  return { events: measures.flat(), measures };
}

/** Sixteenths in one full measure of the given time signature. */
export function measureLength([beats, beatType]: readonly [number, number]): number {
  return beats * (16 / beatType);
}

export interface TimelineEvent {
  /** Empty for rests. */
  midis: Midi[];
  /** Start, in quarter-note beats from the beginning. */
  start: number;
  /** Length in quarter-note beats. */
  beats: number;
}

/** Converts parsed notation to a playback timeline in quarter-note beats. */
export function toTimeline(events: readonly NotationEvent[]): TimelineEvent[] {
  let cursor = 0;
  return events.map((event) => {
    const item = { midis: event.pitches.map((p) => p.midi), start: cursor / 4, beats: event.sixteenths / 4 };
    cursor += event.sixteenths;
    return item;
  });
}

export interface StaffNote {
  midi: Midi;
  start: number;
  beats: number;
  /** 1 = treble / right hand, 2 = bass / left hand. */
  staff: 1 | 2;
}

export interface CursorStep {
  /** Quarter-note beat where this step begins. */
  start: number;
  /** Notes (any staff) that begin here. Empty when only rests begin. */
  notes: StaffNote[];
}

/**
 * Merges one or two staves into the sequence of moments a score cursor visits:
 * one step per distinct onset time (notes or rests) across all staves. This
 * matches how OpenSheetMusicDisplay's cursor walks a score.
 */
export function toCursorSteps(staves: readonly (readonly TimelineEvent[])[]): CursorStep[] {
  const byStart = new Map<number, StaffNote[]>();
  staves.forEach((timeline, index) => {
    for (const event of timeline) {
      const key = Math.round(event.start * 1000) / 1000;
      const list = byStart.get(key) ?? [];
      for (const midi of event.midis) list.push({ midi, start: key, beats: event.beats, staff: (index + 1) as 1 | 2 });
      byStart.set(key, list);
    }
  });
  return [...byStart.entries()].sort((a, b) => a[0] - b[0]).map(([start, notes]) => ({ start, notes }));
}
