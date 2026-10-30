import { pitchClass, type Midi } from "@/lib/music/notes";

export type NoteVerdict = "correct" | "wrong-octave" | "wrong-note";

/**
 * Judges a played note against the target pitch. Exact MIDI match only, so
 * C3 or C5 never pass for C4 — but they get a more encouraging hint.
 */
export function evaluatePlayedNote(played: Midi, target: Midi): NoteVerdict {
  if (played === target) return "correct";
  if (pitchClass(played) === pitchClass(target)) return "wrong-octave";
  return "wrong-note";
}
