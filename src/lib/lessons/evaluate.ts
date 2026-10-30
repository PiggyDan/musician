import { noteLetterOf, pitchClass, type Midi, type NoteLetter } from "@/lib/music/notes";

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

/** True when the played key is the given letter in any octave (black keys never match). */
export function matchesLetter(played: Midi, letter: NoteLetter): boolean {
  return noteLetterOf(played) === letter;
}

export interface SequenceProgress {
  /** Index of the next note to play. Equals `notes.length` when finished. */
  index: number;
  verdict: "correct" | "wrong" | "complete";
}

/**
 * Advances through a melody one note at a time. A wrong note never throws
 * away notes already played correctly — the learner simply retries that note.
 */
export function advanceSequence(index: number, played: Midi, notes: readonly Midi[]): SequenceProgress {
  if (index >= notes.length) return { index: notes.length, verdict: "complete" };
  if (played !== notes[index]) return { index, verdict: "wrong" };
  const next = index + 1;
  return { index: next, verdict: next === notes.length ? "complete" : "correct" };
}
