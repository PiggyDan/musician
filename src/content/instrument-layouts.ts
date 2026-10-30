import type { InstrumentId } from "@/content/instruments";
import type { Midi } from "@/lib/music/notes";

/**
 * Playable layouts for the non-piano instruments (sounding pitch).
 * Strings are listed low → high; the pad draws the highest string on top,
 * like tablature.
 */
export interface StringLayout {
  kind: "strings";
  strings: readonly { name: string; open: Midi }[];
  /** Positions shown per string (0 = open). */
  positions: number;
  /** Fretted instruments show frets; violin/cello show finger positions. */
  fretted: boolean;
}

export interface HarmonicaLayout {
  kind: "harmonica";
  /** C diatonic, 10 holes. */
  blow: readonly Midi[];
  draw: readonly Midi[];
}

export type InstrumentLayout = StringLayout | HarmonicaLayout;

export const LAYOUTS: Record<Exclude<InstrumentId, "piano">, InstrumentLayout> = {
  guitar: {
    kind: "strings",
    strings: [
      { name: "E", open: 40 },
      { name: "A", open: 45 },
      { name: "D", open: 50 },
      { name: "G", open: 55 },
      { name: "B", open: 59 },
      { name: "e", open: 64 },
    ],
    positions: 6,
    fretted: true,
  },
  ukulele: {
    kind: "strings",
    // Standard re-entrant tuning: the G string is the high G above Middle C.
    strings: [
      { name: "G", open: 67 },
      { name: "C", open: 60 },
      { name: "E", open: 64 },
      { name: "A", open: 69 },
    ],
    positions: 6,
    fretted: true,
  },
  violin: {
    kind: "strings",
    strings: [
      { name: "G", open: 55 },
      { name: "D", open: 62 },
      { name: "A", open: 69 },
      { name: "E", open: 76 },
    ],
    positions: 8,
    fretted: false,
  },
  cello: {
    kind: "strings",
    strings: [
      { name: "C", open: 36 },
      { name: "G", open: 43 },
      { name: "D", open: 50 },
      { name: "A", open: 57 },
    ],
    positions: 8,
    fretted: false,
  },
  harmonica: {
    kind: "harmonica",
    blow: [60, 64, 67, 72, 76, 79, 84, 88, 91, 96],
    draw: [62, 67, 71, 74, 77, 81, 83, 86, 89, 93],
  },
};

/** Pitch of a string at a position (frets/semitones above open). */
export function stringNote(instrument: "guitar" | "ukulele" | "violin" | "cello", stringName: string, semitones: number): Midi {
  const layout = LAYOUTS[instrument] as StringLayout;
  const string = layout.strings.find((s) => s.name === stringName);
  if (!string) throw new Error(`${instrument} has no ${stringName} string`);
  return string.open + semitones;
}

/** Pitch of a harmonica hole (1–10), blown or drawn. */
export function harmonicaNote(hole: number, breath: "blow" | "draw"): Midi {
  const layout = LAYOUTS.harmonica as HarmonicaLayout;
  return (breath === "blow" ? layout.blow : layout.draw)[hole - 1];
}
