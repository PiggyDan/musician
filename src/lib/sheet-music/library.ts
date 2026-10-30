import type { InstrumentId } from "@/content/instruments";
import {
  COMPOSERS,
  LICENSES,
  type ComposerId,
  type Difficulty,
  type Genre,
  type ScoreEntry,
} from "@/content/sheet-music/catalog";
import { parseMelody, toCursorSteps, toTimeline, type CursorStep, type StaffNote } from "./notation";
import { toMusicXml } from "./musicxml";

export interface LibraryFilters {
  query: string;
  instrument: InstrumentId | "all";
  difficulty: Difficulty | "all";
  genre: Genre | "all";
  composer: ComposerId | "all";
}

export const EMPTY_FILTERS: LibraryFilters = {
  query: "",
  instrument: "all",
  difficulty: "all",
  genre: "all",
  composer: "all",
};

const DIFFICULTY_VALUES: readonly LibraryFilters["difficulty"][] = ["all", "beginner", "elementary", "intermediate"];
const GENRE_VALUES: readonly LibraryFilters["genre"][] = ["all", "classical", "folk", "hymn", "exercise"];
const INSTRUMENT_VALUES: readonly LibraryFilters["instrument"][] = ["all", "piano", "guitar", "ukulele", "harmonica", "violin", "cello"];

function pick<T extends string>(value: string | null, allowed: readonly T[]): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : allowed[0];
}

/** Reads filters from a query string; unknown values fall back to "all". */
export function filtersFromSearch(search: string): LibraryFilters {
  const params = new URLSearchParams(search);
  const composerValues = ["all", ...Object.keys(COMPOSERS)] as LibraryFilters["composer"][];
  return {
    query: (params.get("q") ?? "").slice(0, 80),
    instrument: pick(params.get("instrument"), INSTRUMENT_VALUES),
    difficulty: pick(params.get("difficulty"), DIFFICULTY_VALUES),
    genre: pick(params.get("genre"), GENRE_VALUES),
    composer: pick(params.get("composer"), composerValues),
  };
}

/** Writes non-default filters as a query string ("" when nothing is set). */
export function filtersToSearch(filters: LibraryFilters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  for (const key of ["instrument", "difficulty", "genre", "composer"] as const) {
    if (filters[key] !== "all") params.set(key, filters[key]);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** Lowercases and strips accents so "frere" finds "Frère". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Filters scores. Text search matches titles and composers in both languages. */
export function filterScores(scores: readonly ScoreEntry[], filters: LibraryFilters): ScoreEntry[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean);
  return scores.filter((score) => {
    if (filters.instrument !== "all" && score.instrument !== filters.instrument) return false;
    if (filters.difficulty !== "all" && score.difficulty !== filters.difficulty) return false;
    if (filters.genre !== "all" && score.genre !== filters.genre) return false;
    if (filters.composer !== "all" && score.composer !== filters.composer) return false;
    if (terms.length === 0) return true;
    const composer = COMPOSERS[score.composer].name;
    const haystack = normalize([score.title.en, score.title.mn, composer.en, composer.mn].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

/** The moments a score cursor visits, across both staves of a grand staff. */
export function scoreSteps(score: ScoreEntry): CursorStep[] {
  const staves = [toTimeline(parseMelody(score.melody).events)];
  if (score.bass) staves.push(toTimeline(parseMelody(score.bass).events));
  return toCursorSteps(staves);
}

/** Every note with its start, length and staff. */
export function scoreNotesTimed(score: ScoreEntry): StaffNote[] {
  return scoreSteps(score).flatMap((step) => step.notes);
}

/** Pitches of the upper staff (melody) in order; chords are listed low → high. */
export function scoreNotes(score: ScoreEntry): number[] {
  return parseMelody(score.melody).events.flatMap((e) => e.pitches.map((p) => p.midi));
}

export type PracticeHand = "both" | "right" | "left";

export interface PracticeTarget {
  /** Index into scoreSteps(score) — where the cursor sits. */
  step: number;
  /** Notes that must be held together to move on. */
  midis: number[];
}

/**
 * The sequence practice mode walks through. With one hand selected, steps
 * where only the other hand plays are skipped — practising hands separately
 * is how pianists learn a two-hand piece.
 */
export function practiceTargets(steps: readonly CursorStep[], hand: PracticeHand): PracticeTarget[] {
  return steps.flatMap((step, index) => {
    const midis = step.notes
      .filter((n) => hand === "both" || (hand === "right" ? n.staff === 1 : n.staff === 2))
      .map((n) => n.midi);
    return midis.length > 0 ? [{ step: index, midis: [...new Set(midis)].sort((a, b) => a - b) }] : [];
  });
}

const PART_NAMES: Record<InstrumentId, string> = {
  piano: "Piano",
  guitar: "Guitar",
  ukulele: "Ukulele",
  harmonica: "Harmonica",
  violin: "Violin",
  cello: "Violoncello",
};

/**
 * MusicXML for a catalog entry. Downloads embed the licence; the on-screen
 * copy leaves it out because OSMD would print it as a long credit line (the
 * viewer shows licensing in its own panel and print footer instead).
 */
export function scoreMusicXml(score: ScoreEntry, { forDisplay = false } = {}): string {
  const composer = COMPOSERS[score.composer];
  const license = LICENSES[score.license];
  return toMusicXml({
    title: score.title.en,
    composer: "lifespan" in composer ? `${composer.name.en} (${composer.lifespan})` : composer.name.en,
    partName: PART_NAMES[score.instrument],
    rights: forDisplay ? undefined : `${score.attribution} ${license.name}: ${license.url}`,
    keyFifths: score.keyFifths,
    time: score.time,
    tempo: score.tempo,
    clef: score.clef,
    pickup: score.pickup,
    melody: score.melody,
    bass: score.bass,
  });
}

export function pdfPath(score: ScoreEntry): string {
  return `/sheet-music/pdf/${score.id}.pdf`;
}

export function musicXmlPath(score: ScoreEntry): string {
  return `/sheet-music/${score.id}/musicxml`;
}
