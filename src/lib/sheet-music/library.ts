import type { InstrumentId } from "@/content/instruments";
import {
  COMPOSERS,
  LICENSES,
  type ComposerId,
  type Difficulty,
  type Genre,
  type ScoreEntry,
} from "@/content/sheet-music/catalog";
import { parseMelody, toTimeline, type TimelineEvent } from "./notation";
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

export function scoreTimeline(score: ScoreEntry): TimelineEvent[] {
  return toTimeline(parseMelody(score.melody).events);
}

/** Pitched notes only, in order — the sequence practiced in practice mode. */
export function scoreNotes(score: ScoreEntry): number[] {
  return scoreTimeline(score)
    .map((e) => e.midi)
    .filter((m): m is number => m !== null);
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
  });
}

export function pdfPath(score: ScoreEntry): string {
  return `/sheet-music/pdf/${score.id}.pdf`;
}

export function musicXmlPath(score: ScoreEntry): string {
  return `/sheet-music/${score.id}/musicxml`;
}
