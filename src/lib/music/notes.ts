/**
 * Pitch utilities using scientific pitch notation, where MIDI 60 = C4 = Middle C
 * (≈261.63 Hz). This matches Tone.js and the General MIDI convention.
 */

export type Midi = number;

export const MIDDLE_C: Midi = 60;
export const MIDI_MIN: Midi = 21; // A0, lowest key on an 88-key piano
export const MIDI_MAX: Midi = 108; // C8, highest key on an 88-key piano

export const PITCH_CLASSES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type PitchClassName = (typeof PITCH_CLASSES)[number];

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function pitchClass(midi: Midi): number {
  return ((midi % 12) + 12) % 12;
}

export function octaveOf(midi: Midi): number {
  return Math.floor(midi / 12) - 1;
}

export function isBlackKey(midi: Midi): boolean {
  return BLACK_PITCH_CLASSES.has(pitchClass(midi));
}

export function pitchClassName(midi: Midi): PitchClassName {
  return PITCH_CLASSES[pitchClass(midi)];
}

/** e.g. 60 → "C4", 61 → "C#4" */
export function midiToNoteName(midi: Midi): string {
  return `${pitchClassName(midi)}${octaveOf(midi)}`;
}

const NOTE_NAME_RE = /^([A-Ga-g])([#b]?)(-?\d)$/;
const LETTER_OFFSETS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** e.g. "C4" → 60, "Db4" → 61. Returns null for unparseable input. */
export function noteNameToMidi(name: string): Midi | null {
  const match = NOTE_NAME_RE.exec(name.trim());
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return (
    (Number(octave) + 1) * 12 +
    LETTER_OFFSETS[letter.toUpperCase()] +
    accidentalOffset
  );
}

/** Equal temperament, A4 = 440 Hz. */
export function midiToFrequency(midi: Midi): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function clampMidi(midi: Midi): Midi {
  return Math.min(MIDI_MAX, Math.max(MIDI_MIN, midi));
}

export interface KeyboardKey {
  midi: Midi;
  name: string;
  isBlack: boolean;
  /** Index of the white key this key sits on (black keys: the white key to their left). */
  whiteIndex: number;
}

/**
 * Builds the key list for a keyboard that starts on a white key and spans
 * `whiteKeyCount` white keys, including every black key between them.
 */
export function buildKeyboard(startMidi: Midi, whiteKeyCount: number): KeyboardKey[] {
  let start = startMidi;
  while (isBlackKey(start)) start -= 1;

  const keys: KeyboardKey[] = [];
  let whites = 0;
  for (let midi = start; ; midi += 1) {
    if (isBlackKey(midi)) {
      // Only include black keys that sit between two rendered white keys.
      if (whites < whiteKeyCount) {
        keys.push({ midi, name: midiToNoteName(midi), isBlack: true, whiteIndex: whites - 1 });
      }
    } else {
      if (whites === whiteKeyCount) break;
      keys.push({ midi, name: midiToNoteName(midi), isBlack: false, whiteIndex: whites });
      whites += 1;
    }
  }
  return keys;
}

/** Moves `count` white keys from a white-key start (negative moves down). */
export function offsetWhiteKeys(startMidi: Midi, count: number): Midi {
  let midi = startMidi;
  let remaining = Math.abs(count);
  const step = count < 0 ? -1 : 1;
  while (remaining > 0) {
    midi += step;
    if (!isBlackKey(midi)) remaining -= 1;
  }
  return midi;
}

export const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type NoteLetter = (typeof NOTE_LETTERS)[number];

/** The letter of a white key ("C" for 60), or null for black keys. */
export function noteLetterOf(midi: Midi): NoteLetter | null {
  if (isBlackKey(midi)) return null;
  return pitchClassName(midi) as NoteLetter;
}
