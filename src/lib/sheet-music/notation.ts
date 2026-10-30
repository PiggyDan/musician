import { noteNameToMidi, type Midi } from "@/lib/music/notes";

/**
 * Compact melody notation used by the catalog, e.g.
 *   "E4:q E4:q F4:q G4:q | D4:q. C4:8 C4:h"
 * Tokens are PITCH:DURATION. PITCH is a note name (C4, F#5, Bb3) or "r" for a
 * rest. DURATION is w, h, q, 8 or 16, with an optional trailing "." for dotted.
 * "|" separates measures.
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

export interface NotationEvent {
  /** null for rests. */
  midi: Midi | null;
  step: string | null;
  alter: number;
  octave: number | null;
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

const TOKEN_RE = /^(r|[A-G](?:#|b)?-?\d):(w|h|q|8|16)(\.)?$/;

export function parseMelody(source: string): ParsedMelody {
  const measures: NotationEvent[][] = [];
  const bars = source.split("|").map((bar) => bar.trim()).filter(Boolean);

  bars.forEach((bar, measure) => {
    const events: NotationEvent[] = [];
    for (const token of bar.split(/\s+/)) {
      const match = TOKEN_RE.exec(token);
      if (!match) throw new Error(`Invalid notation token "${token}" in measure ${measure + 1}`);
      const [, pitch, code, dot] = match;
      const duration = code as DurationCode;
      const dotted = Boolean(dot);
      const sixteenths = SIXTEENTHS[duration] * (dotted ? 1.5 : 1);
      if (pitch === "r") {
        events.push({ midi: null, step: null, alter: 0, octave: null, code: duration, dotted, sixteenths, measure });
        continue;
      }
      const midi = noteNameToMidi(pitch);
      if (midi === null) throw new Error(`Invalid pitch "${pitch}"`);
      const step = pitch[0];
      const alter = pitch[1] === "#" ? 1 : pitch[1] === "b" ? -1 : 0;
      const octave = Number(pitch.slice(alter === 0 ? 1 : 2));
      events.push({ midi, step, alter, octave, code: duration, dotted, sixteenths, measure });
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
  midi: Midi | null;
  /** Start, in quarter-note beats from the beginning. */
  start: number;
  /** Length in quarter-note beats. */
  beats: number;
}

/** Converts parsed notation to a playback timeline in quarter-note beats. */
export function toTimeline(events: readonly NotationEvent[]): TimelineEvent[] {
  let cursor = 0;
  return events.map((event) => {
    const item = { midi: event.midi, start: cursor / 4, beats: event.sixteenths / 4 };
    cursor += event.sixteenths;
    return item;
  });
}
