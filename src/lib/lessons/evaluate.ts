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

export type ChordRole = "root" | "third" | "fifth" | "other";

/**
 * A chord tone's job relative to the root: in C major, C is the root, E the
 * third and G the fifth — in any octave or order (inversions keep their roles).
 */
export function chordRole(midi: Midi, root: Midi): ChordRole {
  const interval = (((midi - root) % 12) + 12) % 12;
  if (interval === 0) return "root";
  if (interval === 3 || interval === 4) return "third";
  if (interval === 7) return "fifth";
  return "other";
}

export interface HeldEvaluation {
  status: "complete" | "partial" | "wrong";
  /** Required notes not yet held. */
  missing: Midi[];
  /** Held notes that don't belong. */
  wrong: Midi[];
}

/**
 * Compares the keys currently held with a required set (a chord, or both
 * hands together). Complete only when every required note is down and no
 * stray note is.
 */
export function evaluateHeld(held: readonly Midi[], required: readonly Midi[]): HeldEvaluation {
  const heldSet = new Set(held);
  const requiredSet = new Set(required);
  const missing = [...requiredSet].filter((m) => !heldSet.has(m)).sort((a, b) => a - b);
  const wrong = [...heldSet].filter((m) => !requiredSet.has(m)).sort((a, b) => a - b);
  return { status: wrong.length > 0 ? "wrong" : missing.length > 0 ? "partial" : "complete", missing, wrong };
}
