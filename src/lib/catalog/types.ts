import type { InstrumentId } from "@/content/instruments";

/**
 * Song catalog model. Five things are deliberately separate, because having
 * one never implies the others:
 *  1. metadata        — facts about a song (title, artist, year, genre)
 *  2. playback        — whether *we* may let you hear a recording, and how
 *  3. sheet music     — whether a licensed/permitted notated arrangement exists
 *  4. practice        — whether an interactive MusicPath arrangement exists
 *  5. downloads       — what files, if any, may be downloaded
 * A song can be fully described (1) with nothing else available.
 */

export type GenreId = "worship" | "gospel" | "pop" | "rock" | "kpop" | "classical" | "mongolian" | "folk";

export interface Localized {
  en: string;
  mn: string;
}

export interface SongMetadata {
  title: Localized;
  artist: Localized;
  year: string;
  genres: readonly GenreId[];
}

/**
 * How a song may be heard. Only these kinds exist — there is no "free mp3" or
 * scraped-stream option.
 *  - musicpath-performance: our own synthesized performance of a public-domain
 *    or original MusicPath arrangement (we own the arrangement and the sound)
 *  - licensed-audio: an audio file we hold a licence for (none yet)
 *  - official-embed: a rights holder's own upload played through the
 *    platform's official embed player (allow-listed hosts only)
 */
export type PlaybackSource =
  | { kind: "musicpath-performance"; scoreId: string }
  | { kind: "licensed-audio"; url: string; licence: string }
  | { kind: "official-embed"; provider: "youtube" | "spotify"; embedId: string; verifiedBy: string };

/** Links that only open a platform's own search — no media is played or hosted here. */
export interface ExternalSearchLink {
  provider: "youtube" | "spotify";
  query: string;
}

export type SheetMusicAvailability =
  | { status: "available"; scoreIds: readonly string[] }
  | { status: "unavailable"; reason: "not-licensed" | "not-yet-arranged" };

export interface PracticeArrangement {
  scoreId: string;
  instrument: InstrumentId;
  /** Slug of a related piano lesson. */
  relatedLesson?: string;
}

export interface DownloadPermissions {
  /** Score ids whose MusicXML/PDF may be downloaded (licence permits). */
  scoreIds: readonly string[];
  /** Recordings are never downloadable unless a licence explicitly says so. */
  recording: false;
}

export type RightsBasis =
  | "public-domain"
  | "musicpath-original"
  /** Only factual metadata is shown; the work and recordings are copyrighted. */
  | "metadata-only";

export interface Song {
  /** Stable, provider-prefixed id, e.g. "musicpath:ode-to-joy". */
  id: string;
  provider: string;
  metadata: SongMetadata;
  rights: RightsBasis;
  playback: readonly PlaybackSource[];
  externalLinks: readonly ExternalSearchLink[];
  sheetMusic: SheetMusicAvailability;
  practice: readonly PracticeArrangement[];
  downloads: DownloadPermissions;
}

export interface SongQuery {
  text: string;
  genre: GenreId | "all";
  instrument: InstrumentId | "all";
  /** Only songs with something playable or practisable here. */
  playableOnly: boolean;
}

/**
 * A source of songs. Today: the MusicPath catalog and a curated metadata list.
 * Future licensed providers (metadata, streaming, sheet music) implement the
 * same interface and are merged by the catalog service.
 */
export interface CatalogProvider {
  id: string;
  /** Human-readable name shown as attribution. */
  name: string;
  list(): Promise<readonly Song[]>;
}
