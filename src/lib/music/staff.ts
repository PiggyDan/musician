import { isBlackKey, octaveOf, pitchClassName, type Midi } from "./notes";

export type StaffClef = "treble" | "bass";

const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Letter steps from C0: C4 = 28, D4 = 29 … (the natural note's position). */
export function diatonicIndex(midi: Midi): number {
  const natural = isBlackKey(midi) ? midi - 1 : midi;
  return octaveOf(natural) * 7 + LETTER_INDEX[pitchClassName(natural)[0]];
}

/** Bottom line of each staff: E4 (treble) and G2 (bass). */
const BOTTOM_LINE: Record<StaffClef, number> = { treble: diatonicIndex(64), bass: diatonicIndex(43) };

export type StaffPosition =
  | { kind: "line"; number: number }
  | { kind: "space"; number: number }
  | { kind: "ledger-below"; count: number }
  | { kind: "below" }
  | { kind: "ledger-above"; count: number }
  | { kind: "above" };

/**
 * Where a note sits on the staff, counted from the bottom like musicians do:
 * lines 1–5 and spaces 1–4. Middle C is on one ledger line below the treble
 * staff and one ledger line above the bass staff.
 */
export function staffPosition(midi: Midi, clef: StaffClef): StaffPosition {
  const steps = diatonicIndex(midi) - BOTTOM_LINE[clef]; // 0 = bottom line
  if (steps >= 0 && steps <= 8) {
    return steps % 2 === 0 ? { kind: "line", number: steps / 2 + 1 } : { kind: "space", number: (steps + 1) / 2 };
  }
  if (steps < 0) {
    if (steps === -1) return { kind: "below" };
    return steps % 2 === 0 ? { kind: "ledger-below", count: -steps / 2 } : { kind: "below" };
  }
  if (steps === 9) return { kind: "above" };
  return steps % 2 === 0 ? { kind: "ledger-above", count: (steps - 8) / 2 } : { kind: "above" };
}
