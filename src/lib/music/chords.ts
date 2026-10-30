import { PITCH_CLASSES, pitchClass, type Midi } from "./notes";

interface ChordShape {
  suffix: string;
  intervals: readonly number[];
}

// Ordered from most to least specific so 4-note chords win over their triads.
const CHORD_SHAPES: readonly ChordShape[] = [
  { suffix: "maj7", intervals: [0, 4, 7, 11] },
  { suffix: "7", intervals: [0, 4, 7, 10] },
  { suffix: "m7", intervals: [0, 3, 7, 10] },
  { suffix: "m7b5", intervals: [0, 3, 6, 10] },
  { suffix: "dim7", intervals: [0, 3, 6, 9] },
  { suffix: "", intervals: [0, 4, 7] },
  { suffix: "m", intervals: [0, 3, 7] },
  { suffix: "dim", intervals: [0, 3, 6] },
  { suffix: "aug", intervals: [0, 4, 8] },
  { suffix: "sus2", intervals: [0, 2, 7] },
  { suffix: "sus4", intervals: [0, 5, 7] },
];

/**
 * Names the chord formed by the held notes (ignoring octave and voicing),
 * e.g. [60, 64, 67] → "C", [64, 67, 72] → "C/E". Returns null when no shape matches.
 */
export function detectChord(notes: readonly Midi[]): string | null {
  if (notes.length < 3) return null;
  const classes = [...new Set(notes.map(pitchClass))].sort((a, b) => a - b);
  if (classes.length < 3) return null;
  const bass = pitchClass(Math.min(...notes));

  for (const shape of CHORD_SHAPES) {
    if (shape.intervals.length !== classes.length) continue;
    for (const root of classes) {
      const matches = shape.intervals.every((interval) =>
        classes.includes((root + interval) % 12),
      );
      if (!matches) continue;
      const name = `${PITCH_CLASSES[root]}${shape.suffix}`;
      return bass === root ? name : `${name}/${PITCH_CLASSES[bass]}`;
    }
  }
  return null;
}
