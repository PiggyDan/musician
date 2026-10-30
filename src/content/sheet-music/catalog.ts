import type { InstrumentId } from "@/content/instruments";
import {
  FIRST_LIGHT_LH,
  FIRST_LIGHT_RH,
  ODE_TO_JOY_LH,
  ODE_TO_JOY_RH,
  SUNRISE_STEPS_RH,
  TWINKLE_LH,
  TWINKLE_RH,
} from "@/content/music/pieces";
import type { ClefKind } from "@/lib/sheet-music/musicxml";

/**
 * The sheet music library. Every entry is either
 *  - a public-domain composition (composer died long ago / traditional melody),
 *    newly engraved by MusicPath from the melody and released under CC0, or
 *  - an original MusicPath exercise released under CC BY 4.0.
 * Nothing here is copied from another publisher's edition. Melodies are
 * simplified single-line arrangements; each entry says so in its source note.
 *
 * To add a score: write the melody in notation.ts format at sounding pitch,
 * fill in every field, and run `npm test` (measure lengths, ranges and
 * licensing are validated) and `npm run pdfs` (regenerates the PDF files).
 */

export type Difficulty = "beginner" | "elementary" | "intermediate";
export type Genre = "classical" | "folk" | "hymn" | "exercise";
export type LicenseId = "cc0" | "cc-by-4.0";
export type ScoreFormat = "musicxml" | "pdf";

export interface Localized {
  en: string;
  mn: string;
}

export interface Composer {
  id: string;
  name: Localized;
  /** e.g. "1770–1827"; omitted for traditional melodies. */
  lifespan?: string;
}

export interface LicenseInfo {
  id: LicenseId;
  name: string;
  url: string;
}

export const LICENSES: Record<LicenseId, LicenseInfo> = {
  cc0: {
    id: "cc0",
    name: "CC0 1.0 Universal (Public Domain Dedication)",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "cc-by-4.0": {
    id: "cc-by-4.0",
    name: "Creative Commons Attribution 4.0 International",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
};

export const COMPOSERS = {
  beethoven: { id: "beethoven", name: { en: "Ludwig van Beethoven", mn: "Людвиг ван Бетховен" }, lifespan: "1770–1827" },
  petzold: { id: "petzold", name: { en: "Christian Petzold", mn: "Кристиан Петцольд" }, lifespan: "1677–1733" },
  mason: { id: "mason", name: { en: "Lowell Mason (attrib.)", mn: "Лоуэлл Мэйсон (таамаглал)" }, lifespan: "1792–1872" },
  traditional: { id: "traditional", name: { en: "Traditional", mn: "Ардын" } },
  musicpath: { id: "musicpath", name: { en: "MusicPath", mn: "MusicPath" } },
} as const satisfies Record<string, Composer>;

export type ComposerId = keyof typeof COMPOSERS;

export interface ScoreEntry {
  /** URL slug; stable. */
  id: string;
  title: Localized;
  composer: ComposerId;
  instrument: InstrumentId;
  difficulty: Difficulty;
  genre: Genre;
  /** When the composition dates from. */
  year: string;
  keyFifths: number;
  time: readonly [number, number];
  tempo: number;
  clef: ClefKind;
  pickup?: boolean;
  /** Upper staff (melody) at sounding pitch, in notation.ts format. */
  melody: string;
  /** Lower staff for piano grand staff (bass clef, left hand). */
  bass?: string;
  /** Slug of the piano lesson that teaches this piece or its skills. */
  relatedLesson?: string;
  /** Where the music comes from and what was changed. */
  source: Localized;
  /** Public-domain status of the underlying composition. */
  compositionStatus: Localized;
  license: LicenseId;
  attribution: string;
  formats: readonly ScoreFormat[];
}

const BOTH: readonly ScoreFormat[] = ["musicxml", "pdf"];

/** Moves every pitch in a melody string by whole octaves. */
function shiftOctaves(melody: string, octaves: number): string {
  return melody.replace(/([A-G](?:#|b)?)(-?\d)/g, (_, pitch: string, octave: string) => `${pitch}${Number(octave) + octaves}`);
}

const PD_ENGRAVING = "Engraving by MusicPath, dedicated to the public domain under CC0 1.0.";
const ORIGINAL = "© MusicPath. Licensed under CC BY 4.0 — credit “MusicPath”.";

const ODE_TO_JOY = ODE_TO_JOY_RH;
const TWINKLE = TWINKLE_RH;
const MINUET_IN_G =
  "D5:q G4:8 A4:8 B4:8 C5:8 | D5:q G4:q G4:q | E5:q C5:8 D5:8 E5:8 F#5:8 | G5:q G4:q G4:q | C5:q D5:8 C5:8 B4:8 A4:8 | B4:q C5:8 B4:8 A4:8 G4:8 | F#4:q G4:8 A4:8 B4:8 G4:8 | A4:h.";

const ODE_SOURCE: Localized = {
  en: "Main theme (“Ode to Joy”) from Symphony No. 9 in D minor, Op. 125, 4th movement (1824). Simplified melody, transposed to C major.",
  mn: "9-р симфони, ре минор, Op. 125-ын 4-р хэсгийн гол сэдэв (“Баяр баясгалангийн магтаал”, 1824). Хялбаршуулсан аялгуу, до мажорт шилжүүлсэн.",
};
const TWINKLE_SOURCE: Localized = {
  en: "French folk melody “Ah ! vous dirai-je, maman”, first published in 1761, known in English as “Twinkle, Twinkle, Little Star”.",
  mn: "1761 онд анх хэвлэгдсэн Францын ардын аялгуу “Ah ! vous dirai-je, maman”. Англиар “Twinkle, Twinkle, Little Star” нэрээр алдартай.",
};
const MINUET_SOURCE: Localized = {
  en: "Minuet in G major, BWV Anh. 114, from the 1725 Notebook for Anna Magdalena Bach (long attributed to J. S. Bach). Right-hand melody, bars 1–8.",
  mn: "Анна Магдалена Бахын 1725 оны дэвтрээс соль мажор менуэт, BWV Anh. 114 (удаан хугацаанд И. С. Бахынх гэж үздэг байсан). Баруун гарын аялгуу, 1–8-р хэмжүүр.",
};

const pd = (died: string): Localized => ({
  en: `Public domain — composer died ${died}.`,
  mn: `Нийтийн өмч — хөгжмийн зохиолч ${died} онд нас барсан.`,
});
const PD_TRADITIONAL: Localized = {
  en: "Public domain — traditional melody.",
  mn: "Нийтийн өмч — ардын аялгуу.",
};
const ORIGINAL_STATUS: Localized = {
  en: "Original MusicPath composition.",
  mn: "MusicPath-ийн анхны бүтээл.",
};

export const SCORES: readonly ScoreEntry[] = [
  {
    id: "ode-to-joy-piano",
    title: { en: "Ode to Joy", mn: "Баяр баясгалангийн магтаал" },
    composer: "beethoven",
    instrument: "piano",
    difficulty: "beginner",
    genre: "classical",
    year: "1824",
    keyFifths: 0,
    time: [4, 4],
    tempo: 100,
    clef: "treble",
    melody: ODE_TO_JOY,
    source: ODE_SOURCE,
    compositionStatus: pd("1827"),
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "ode-to-joy-cello",
    title: { en: "Ode to Joy", mn: "Баяр баясгалангийн магтаал" },
    composer: "beethoven",
    instrument: "cello",
    difficulty: "beginner",
    genre: "classical",
    year: "1824",
    keyFifths: 0,
    time: [4, 4],
    tempo: 92,
    clef: "bass",
    melody: shiftOctaves(ODE_TO_JOY, -1),
    source: { en: `${ODE_SOURCE.en} Written an octave lower for cello.`, mn: `${ODE_SOURCE.mn} Виолончельд нэг октав нам бичсэн.` },
    compositionStatus: pd("1827"),
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "twinkle-piano",
    title: { en: "Twinkle, Twinkle, Little Star", mn: "Гялалз, гялалз, бяцхан од" },
    composer: "traditional",
    instrument: "piano",
    difficulty: "beginner",
    genre: "folk",
    year: "1761",
    keyFifths: 0,
    time: [4, 4],
    tempo: 96,
    clef: "treble",
    melody: TWINKLE,
    source: TWINKLE_SOURCE,
    compositionStatus: PD_TRADITIONAL,
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "twinkle-ukulele",
    title: { en: "Twinkle, Twinkle, Little Star", mn: "Гялалз, гялалз, бяцхан од" },
    composer: "traditional",
    instrument: "ukulele",
    difficulty: "beginner",
    genre: "folk",
    year: "1761",
    keyFifths: 0,
    time: [4, 4],
    tempo: 96,
    clef: "treble",
    melody: TWINKLE,
    source: { en: `${TWINKLE_SOURCE.en} Melody line for ukulele in standard tuning.`, mn: `${TWINKLE_SOURCE.mn} Стандарт тохируулгатай укулеледэх аялгуу.` },
    compositionStatus: PD_TRADITIONAL,
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "minuet-in-g-piano",
    title: { en: "Minuet in G", mn: "Соль мажор менуэт" },
    composer: "petzold",
    instrument: "piano",
    difficulty: "elementary",
    genre: "classical",
    year: "1725",
    keyFifths: 1,
    time: [3, 4],
    tempo: 104,
    clef: "treble",
    melody: MINUET_IN_G,
    source: MINUET_SOURCE,
    compositionStatus: pd("1733"),
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "minuet-in-g-violin",
    title: { en: "Minuet in G", mn: "Соль мажор менуэт" },
    composer: "petzold",
    instrument: "violin",
    difficulty: "elementary",
    genre: "classical",
    year: "1725",
    keyFifths: 1,
    time: [3, 4],
    tempo: 100,
    clef: "treble",
    melody: MINUET_IN_G,
    source: MINUET_SOURCE,
    compositionStatus: pd("1733"),
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "frere-jacques-guitar",
    title: { en: "Frère Jacques", mn: "Жак ах" },
    composer: "traditional",
    instrument: "guitar",
    difficulty: "beginner",
    genre: "folk",
    year: "18th century",
    keyFifths: 0,
    time: [4, 4],
    tempo: 100,
    clef: "treble-8vb",
    melody:
      "C3:q D3:q E3:q C3:q | C3:q D3:q E3:q C3:q | E3:q F3:q G3:h | E3:q F3:q G3:h | G3:8 A3:8 G3:8 F3:8 E3:q C3:q | G3:8 A3:8 G3:8 F3:8 E3:q C3:q | C3:q G2:q C3:h | C3:q G2:q C3:h",
    source: {
      en: "Traditional French round, known since the 18th century. Melody in standard guitar notation (sounds an octave lower than written).",
      mn: "18-р зуунаас мэдэгдэх Францын ардын канон. Гитарын стандарт тэмдэглэгээгээр (бичсэнээс нэг октав нам дуугарна).",
    },
    compositionStatus: PD_TRADITIONAL,
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "hot-cross-buns-harmonica",
    title: { en: "Hot Cross Buns", mn: "Халуун загалмайт боов" },
    composer: "traditional",
    instrument: "harmonica",
    difficulty: "beginner",
    genre: "folk",
    year: "18th century",
    keyFifths: 0,
    time: [4, 4],
    tempo: 92,
    clef: "treble",
    melody: "E4:q D4:q C4:h | E4:q D4:q C4:h | C4:8 C4:8 C4:8 C4:8 D4:8 D4:8 D4:8 D4:8 | E4:q D4:q C4:h",
    source: {
      en: "Traditional English street cry, printed by the 18th century. For a 10-hole diatonic harmonica in C (holes 4–5).",
      mn: "18-р зуунд хэвлэгдсэн Английн уламжлалт гудамжны дуудлага. До түлхүүртэй 10 нүхтэй диатоник хармоникт (4–5-р нүх).",
    },
    compositionStatus: PD_TRADITIONAL,
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "amazing-grace-harmonica",
    title: { en: "Amazing Grace", mn: "Гайхамшигт нигүүлсэл" },
    composer: "traditional",
    instrument: "harmonica",
    difficulty: "elementary",
    genre: "hymn",
    year: "1829",
    keyFifths: 0,
    time: [3, 4],
    tempo: 80,
    clef: "treble",
    pickup: true,
    // An octave up, where a C harmonica has every note without bending (holes 6–9).
    melody: "G5:q | C6:h E6:8 C6:8 | E6:h D6:q | C6:h A5:q | G5:h G5:q | C6:h E6:8 C6:8 | E6:h D6:q | G6:h.",
    source: {
      en: "Hymn tune “New Britain”, first published in 1829; words by John Newton (1779). First phrase in C, for a diatonic harmonica in C (holes 6–9, no bends).",
      mn: "1829 онд анх хэвлэгдсэн “New Britain” магтуу; үгийг Жон Ньютон (1779). Эхний хэсэг, до түлхүүртэй диатоник хармоникт (6–9-р нүх, нугалалтгүй).",
    },
    compositionStatus: {
      en: "Public domain — published 1829; lyricist John Newton died 1807.",
      mn: "Нийтийн өмч — 1829 онд хэвлэгдсэн; үгийн зохиолч Жон Ньютон 1807 онд нас барсан.",
    },
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "au-clair-de-la-lune-violin",
    title: { en: "Au clair de la lune", mn: "Сарны гэрэлд" },
    composer: "traditional",
    instrument: "violin",
    difficulty: "beginner",
    genre: "folk",
    year: "18th century",
    keyFifths: 0,
    time: [4, 4],
    tempo: 92,
    clef: "treble",
    melody:
      "C5:q C5:q C5:q D5:q | E5:h D5:h | C5:q E5:q D5:q D5:q | C5:w | C5:q C5:q C5:q D5:q | E5:h D5:h | C5:q E5:q D5:q D5:q | C5:w",
    source: {
      en: "Traditional French song from the 18th century. First verse melody.",
      mn: "18-р зууны Францын ардын дуу. Эхний бадгийн аялгуу.",
    },
    compositionStatus: PD_TRADITIONAL,
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "mary-had-a-little-lamb-piano",
    title: { en: "Mary Had a Little Lamb", mn: "Мэри бяцхан хургатай" },
    composer: "mason",
    instrument: "piano",
    difficulty: "beginner",
    genre: "folk",
    year: "1830s",
    keyFifths: 0,
    time: [4, 4],
    tempo: 100,
    clef: "treble",
    melody:
      "E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h | E4:q D4:q C4:q D4:q | E4:q E4:q E4:q E4:q | D4:q D4:q E4:q D4:q | C4:w",
    source: {
      en: "American nursery melody (1830s), usually attributed to Lowell Mason; words by Sarah Josepha Hale (1830).",
      mn: "Америкийн хүүхдийн аялгуу (1830-аад он), ихэвчлэн Лоуэлл Мэйсонд хамааруулдаг; үгийг Сара Жозефа Хейл (1830).",
    },
    compositionStatus: pd("1872"),
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "sunrise-steps-piano",
    title: { en: "Sunrise Steps", mn: "Нар мандах алхам" },
    composer: "musicpath",
    instrument: "piano",
    difficulty: "beginner",
    genre: "exercise",
    year: "2026",
    keyFifths: 0,
    time: [4, 4],
    tempo: 84,
    clef: "treble",
    melody: SUNRISE_STEPS_RH,
    relatedLesson: "3",
    source: {
      en: "Original MusicPath exercise for the C five-finger position (Piano Foundations, Lesson 3).",
      mn: "C таван хурууны байрлалд зориулсан MusicPath-ийн анхны дасгал (Төгөлдөр хуурын үндэс, 3-р хичээл).",
    },
    compositionStatus: ORIGINAL_STATUS,
    license: "cc-by-4.0",
    attribution: ORIGINAL,
    formats: BOTH,
  },
  {
    id: "first-light-piano",
    title: { en: "First Light", mn: "Анхны гэгээ" },
    composer: "musicpath",
    instrument: "piano",
    difficulty: "beginner",
    genre: "exercise",
    year: "2026",
    keyFifths: 0,
    time: [4, 4],
    tempo: 72,
    clef: "treble",
    melody: FIRST_LIGHT_RH,
    relatedLesson: "5",
    source: {
      en: "Original MusicPath beginner piece (Piano Foundations, Lesson 5).",
      mn: "MusicPath-ийн эхлэгчдэд зориулсан анхны бүтээл (Төгөлдөр хуурын үндэс, 5-р хичээл).",
    },
    compositionStatus: ORIGINAL_STATUS,
    license: "cc-by-4.0",
    attribution: ORIGINAL,
    formats: BOTH,
  },
  {
    id: "first-light-both-hands",
    title: { en: "First Light (hands together)", mn: "Анхны гэгээ (хоёр гараар)" },
    composer: "musicpath",
    instrument: "piano",
    difficulty: "beginner",
    genre: "exercise",
    year: "2026",
    keyFifths: 0,
    time: [4, 4],
    tempo: 66,
    clef: "treble",
    melody: FIRST_LIGHT_RH,
    bass: FIRST_LIGHT_LH,
    relatedLesson: "9",
    source: {
      en: "Original MusicPath piece for both hands: melody in the right hand, bass notes C and G in the left (Piano, Lesson 9).",
      mn: "Хоёр гарт зориулсан MusicPath-ийн анхны бүтээл: баруун гарт аялгуу, зүүн гарт C ба G басс нот (Төгөлдөр хуур, 9-р хичээл).",
    },
    compositionStatus: ORIGINAL_STATUS,
    license: "cc-by-4.0",
    attribution: ORIGINAL,
    formats: BOTH,
  },
  {
    id: "twinkle-both-hands",
    title: { en: "Twinkle, Twinkle (hands together)", mn: "Гялалз, гялалз (хоёр гараар)" },
    composer: "traditional",
    instrument: "piano",
    difficulty: "elementary",
    genre: "folk",
    year: "1761",
    keyFifths: 0,
    time: [4, 4],
    tempo: 88,
    clef: "treble",
    melody: TWINKLE_RH,
    bass: TWINKLE_LH,
    relatedLesson: "9",
    source: {
      en: `${TWINKLE_SOURCE.en} MusicPath arrangement for both hands: left-hand bass notes follow the I, IV and V chords.`,
      mn: `${TWINKLE_SOURCE.mn} MusicPath-ийн хоёр гарын найруулга: зүүн гарын басс нот I, IV, V аккордыг дагана.`,
    },
    compositionStatus: PD_TRADITIONAL,
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
  {
    id: "ode-to-joy-both-hands",
    title: { en: "Ode to Joy (hands together)", mn: "Баяр баясгалангийн магтаал (хоёр гараар)" },
    composer: "beethoven",
    instrument: "piano",
    difficulty: "elementary",
    genre: "classical",
    year: "1824",
    keyFifths: 0,
    time: [4, 4],
    tempo: 80,
    clef: "treble",
    melody: ODE_TO_JOY_RH,
    bass: ODE_TO_JOY_LH,
    relatedLesson: "10",
    source: {
      en: `${ODE_SOURCE.en} MusicPath arrangement for both hands with left-hand C and G chords (I and V).`,
      mn: `${ODE_SOURCE.mn} Зүүн гарын C ба G аккордтой (I ба V) MusicPath-ийн хоёр гарын найруулга.`,
    },
    compositionStatus: pd("1827"),
    license: "cc0",
    attribution: PD_ENGRAVING,
    formats: BOTH,
  },
];

export function getScore(id: string): ScoreEntry | undefined {
  return SCORES.find((score) => score.id === id);
}

/** Sounding range each instrument can comfortably play (MIDI), used to validate the catalog. */
export const INSTRUMENT_RANGES: Record<InstrumentId, readonly [number, number]> = {
  piano: [21, 108],
  guitar: [40, 88], // E2 – E6
  ukulele: [60, 81], // C4 – A5 (standard tuning, 12 frets)
  harmonica: [60, 96], // C4 – C7 on a C diatonic
  violin: [55, 100], // G3 – E7
  cello: [36, 76], // C2 – E5
};
