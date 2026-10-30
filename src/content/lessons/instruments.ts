import type { InstrumentId } from "@/content/instruments";
import { harmonicaNote, stringNote } from "@/content/instrument-layouts";
import { PIANO_LESSONS } from "./piano";
import type { LessonDefinition } from "./types";

type Strung = "guitar" | "ukulele" | "violin" | "cello";

/** A note given by where it's played; label is shown under the note ("A·3" = A string, 3rd fret). */
function at(instrument: Strung, string: string, n: number): { midi: number; label: string } {
  return { midi: stringNote(instrument, string, n), label: `${string}·${n}` };
}
function hole(n: number, breath: "blow" | "draw"): { midi: number; label: string } {
  return { midi: harmonicaNote(n, breath), label: `${n}${breath === "blow" ? "↑" : "↓"}` };
}

function sequence(notes: { midi: number; label: string }[]) {
  return { notes: notes.map((n) => n.midi), fingers: notes.map((n) => n.label) };
}

const lesson = (
  instrument: Exclude<InstrumentId, "piano">,
  order: number,
  xp: number,
  i18nKey: LessonDefinition["i18nKey"],
  steps: LessonDefinition["steps"],
): LessonDefinition => ({
  id: `${instrument}-${order}`,
  slug: String(order),
  instrument,
  order,
  xp,
  estimatedMinutes: 3,
  i18nKey,
  unit: 1,
  playable: true,
  steps,
});

/** Open strings, low to high. */
const openStrings = (instrument: Strung, names: string[]) => sequence(names.map((s) => at(instrument, s, 0)));

export const INSTRUMENT_LESSONS: Record<Exclude<InstrumentId, "piano">, readonly LessonDefinition[]> = {
  guitar: [
    lesson("guitar", 1, 10, "g1", [
      { kind: "explain", copy: "g1Intro", diagram: "instrument", instrument: "guitar" },
      { kind: "play-sequence", copy: "g1Play", guide: true, instrument: "guitar", ...openStrings("guitar", ["E", "A", "D", "G", "B", "e"]) },
    ]),
    lesson("guitar", 2, 15, "g2", [
      { kind: "explain", copy: "g2Intro", diagram: "instrument", instrument: "guitar" },
      {
        kind: "play-sequence",
        copy: "g2Play",
        guide: true,
        instrument: "guitar",
        // Frère Jacques, bars 1–2: C (A string, 3rd fret), D (open D), E (D string, 2nd fret).
        ...sequence([at("guitar", "A", 3), at("guitar", "D", 0), at("guitar", "D", 2), at("guitar", "A", 3), at("guitar", "A", 3), at("guitar", "D", 0), at("guitar", "D", 2), at("guitar", "A", 3)]),
      },
    ]),
  ],
  ukulele: [
    lesson("ukulele", 1, 10, "u1", [
      { kind: "explain", copy: "u1Intro", diagram: "instrument", instrument: "ukulele" },
      { kind: "play-sequence", copy: "u1Play", guide: true, instrument: "ukulele", ...openStrings("ukulele", ["G", "C", "E", "A"]) },
    ]),
    lesson("ukulele", 2, 15, "u2", [
      { kind: "explain", copy: "u2Intro", diagram: "instrument", instrument: "ukulele" },
      {
        kind: "play-sequence",
        copy: "u2Play",
        guide: true,
        instrument: "ukulele",
        // Twinkle, Twinkle, first phrase — all open strings: C C G G A A G.
        ...sequence([at("ukulele", "C", 0), at("ukulele", "C", 0), at("ukulele", "G", 0), at("ukulele", "G", 0), at("ukulele", "A", 0), at("ukulele", "A", 0), at("ukulele", "G", 0)]),
      },
    ]),
  ],
  violin: [
    lesson("violin", 1, 10, "v1", [
      { kind: "explain", copy: "v1Intro", diagram: "instrument", instrument: "violin" },
      { kind: "play-sequence", copy: "v1Play", guide: true, instrument: "violin", ...openStrings("violin", ["G", "D", "A", "E"]) },
    ]),
    lesson("violin", 2, 15, "v2", [
      { kind: "explain", copy: "v2Intro", diagram: "instrument", instrument: "violin" },
      {
        kind: "play-sequence",
        copy: "v2Play",
        guide: true,
        instrument: "violin",
        // Au clair de la lune: C (A string +3), D (A string +5), E (open E).
        ...sequence([at("violin", "A", 3), at("violin", "A", 3), at("violin", "A", 3), at("violin", "A", 5), at("violin", "E", 0), at("violin", "A", 5)]),
      },
    ]),
  ],
  cello: [
    lesson("cello", 1, 10, "c1", [
      { kind: "explain", copy: "c1Intro", diagram: "instrument", instrument: "cello" },
      { kind: "play-sequence", copy: "c1Play", guide: true, instrument: "cello", ...openStrings("cello", ["C", "G", "D", "A"]) },
    ]),
    lesson("cello", 2, 15, "c2", [
      { kind: "explain", copy: "c2Intro", diagram: "instrument", instrument: "cello" },
      {
        kind: "play-sequence",
        copy: "c2Play",
        guide: true,
        instrument: "cello",
        // Ode to Joy, bars 1–2 on the D string: E (+2), F (+3), G (+5), D (open).
        ...sequence([at("cello", "D", 2), at("cello", "D", 2), at("cello", "D", 3), at("cello", "D", 5), at("cello", "D", 5), at("cello", "D", 3), at("cello", "D", 2), at("cello", "D", 0)]),
      },
    ]),
  ],
  harmonica: [
    lesson("harmonica", 1, 10, "h1", [
      { kind: "explain", copy: "h1Intro", diagram: "instrument", instrument: "harmonica" },
      {
        kind: "play-sequence",
        copy: "h1Play",
        guide: true,
        instrument: "harmonica",
        // C major scale in the middle octave: 4↑ 4↓ 5↑ 5↓ 6↑ 6↓ 7↓ 7↑.
        ...sequence([hole(4, "blow"), hole(4, "draw"), hole(5, "blow"), hole(5, "draw"), hole(6, "blow"), hole(6, "draw"), hole(7, "draw"), hole(7, "blow")]),
      },
    ]),
    lesson("harmonica", 2, 15, "h2", [
      { kind: "explain", copy: "h2Intro", diagram: "instrument", instrument: "harmonica" },
      {
        kind: "play-sequence",
        copy: "h2Play",
        guide: true,
        instrument: "harmonica",
        // Hot Cross Buns: E D C (2↑ 1↓ 1↑), twice.
        ...sequence([hole(2, "blow"), hole(1, "draw"), hole(1, "blow"), hole(2, "blow"), hole(1, "draw"), hole(1, "blow")]),
      },
    ]),
  ],
};

export function getCourse(instrument: InstrumentId): readonly LessonDefinition[] {
  return instrument === "piano" ? PIANO_LESSONS : INSTRUMENT_LESSONS[instrument];
}

export function getLesson(instrument: InstrumentId, slug: string): LessonDefinition | undefined {
  return getCourse(instrument).find((l) => l.slug === slug);
}
