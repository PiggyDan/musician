import type { Midi } from "@/lib/music/notes";
import { parseMelody, toTimeline } from "@/lib/sheet-music/notation";
import type { Hand, TimedNote } from "./types";

/** Lays [midi, beats] pairs end to end: [[60, 1], [64, 2]] → beats 0 and 1. */
export function melodyToTimedNotes(melody: readonly (readonly [Midi, number])[], hand?: Hand): TimedNote[] {
  let beat = 0;
  return melody.map(([midi, beats]) => {
    const note: TimedNote = hand ? { midi, beat, beats, hand } : { midi, beat, beats };
    beat += beats;
    return note;
  });
}

/**
 * Turns notation (see notation.ts) into timed notes for a lesson — the same
 * source the sheet music library engraves. Chords become simultaneous notes.
 */
export function notationToTimedNotes(right: string, left?: string): TimedNote[] {
  const toNotes = (source: string, hand: Hand) =>
    toTimeline(parseMelody(source).events).flatMap((e) =>
      e.midis.map((midi) => ({ midi, beat: e.start, beats: e.beats, hand })),
    );
  const notes = [...toNotes(right, "right"), ...(left ? toNotes(left, "left") : [])];
  return notes.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}

/** Total length in beats (end of the last note). */
export function lengthInBeats(notes: readonly TimedNote[]): number {
  return notes.reduce((end, note) => Math.max(end, note.beat + note.beats), 0);
}
