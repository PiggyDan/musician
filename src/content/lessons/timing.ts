import type { Midi } from "@/lib/music/notes";
import type { TimedNote } from "./types";

/** Lays [midi, beats] pairs end to end: [[60, 1], [64, 2]] → beats 0 and 1. */
export function melodyToTimedNotes(melody: readonly (readonly [Midi, number])[]): TimedNote[] {
  let beat = 0;
  return melody.map(([midi, beats]) => {
    const note = { midi, beat, beats };
    beat += beats;
    return note;
  });
}

/** Total length in beats (end of the last note). */
export function lengthInBeats(notes: readonly TimedNote[]): number {
  return notes.reduce((end, note) => Math.max(end, note.beat + note.beats), 0);
}
