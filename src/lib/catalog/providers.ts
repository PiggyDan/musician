import { COMPOSERS, SCORES, type ScoreEntry } from "@/content/sheet-music/catalog";
import { CURATED_METADATA, SPOTIFY_VERIFIED_LABEL, VERIFIED_LABEL } from "@/content/songs/curated";
import type { PlaybackSource } from "./types";
import type { CatalogProvider, GenreId, Song } from "./types";

/** Groups the sheet-music library into songs: one song, several arrangements. */
const SONG_GROUPS: Record<string, { genres: GenreId[]; scores: string[] }> = {
  "ode-to-joy": { genres: ["classical"], scores: ["ode-to-joy-piano", "ode-to-joy-both-hands", "ode-to-joy-cello"] },
  twinkle: { genres: ["folk", "classical"], scores: ["twinkle-piano", "twinkle-both-hands", "twinkle-ukulele"] },
  "minuet-in-g": { genres: ["classical"], scores: ["minuet-in-g-piano", "minuet-in-g-violin"] },
  "frere-jacques": { genres: ["folk"], scores: ["frere-jacques-guitar"] },
  "hot-cross-buns": { genres: ["folk"], scores: ["hot-cross-buns-harmonica"] },
  "amazing-grace": { genres: ["worship", "gospel"], scores: ["amazing-grace-harmonica"] },
  "au-clair-de-la-lune": { genres: ["folk"], scores: ["au-clair-de-la-lune-violin"] },
  "mary-had-a-little-lamb": { genres: ["folk"], scores: ["mary-had-a-little-lamb-piano"] },
  "sunrise-steps": { genres: ["classical"], scores: ["sunrise-steps-piano"] },
  "first-light": { genres: ["classical"], scores: ["first-light-piano", "first-light-both-hands"] },
};

function songFromScores(slug: string, scores: ScoreEntry[], genres: GenreId[]): Song {
  const lead = scores[0];
  const composer = COMPOSERS[lead.composer];
  const original = lead.composer === "musicpath";
  // Prefer a single-staff arrangement for the title (two-hand titles say "(hands together)").
  const titled = scores.find((s) => !s.bass) ?? lead;
  return {
    id: `musicpath:${slug}`,
    provider: "musicpath",
    metadata: { title: titled.title, artist: composer.name, year: lead.year, genres },
    rights: original ? "musicpath-original" : "public-domain",
    playback: [{ kind: "musicpath-performance", scoreId: titled.id }],
    externalLinks: [],
    sheetMusic: { status: "available", scoreIds: scores.map((s) => s.id) },
    practice: scores.map((s) => ({ scoreId: s.id, instrument: s.instrument, relatedLesson: s.relatedLesson })),
    downloads: { scoreIds: scores.filter((s) => s.formats.length > 0).map((s) => s.id), recording: false },
  };
}

/** Public-domain and original works MusicPath owns or may freely use. */
export const musicPathProvider: CatalogProvider = {
  id: "musicpath",
  name: "MusicPath",
  async list() {
    return Object.entries(SONG_GROUPS).map(([slug, group]) =>
      songFromScores(
        slug,
        group.scores.map((id) => {
          const score = SCORES.find((s) => s.id === id);
          if (!score) throw new Error(`Unknown score ${id}`);
          return score;
        }),
        group.genres,
      ),
    );
  },
};

/**
 * Contemporary songs as facts only (title, artist, year, genre). Nothing is
 * played, shown or downloaded here — only links to search the official
 * platforms. Replace with a licensed metadata/streaming provider later.
 */
export const curatedMetadataProvider: CatalogProvider = {
  id: "curated",
  name: "MusicPath editorial (metadata only)",
  async list() {
    return CURATED_METADATA.map((entry) => ({
      id: `curated:${entry.slug}`,
      provider: "curated",
      metadata: { title: entry.title, artist: entry.artist, year: entry.year, genres: entry.genres },
      rights: "metadata-only" as const,
      // Audio first (Spotify's player), then the official video as a fallback.
      playback: [
        ...(entry.spotify
          ? [{ kind: "official-embed", provider: "spotify", embedId: entry.spotify.id, verifiedBy: `${SPOTIFY_VERIFIED_LABEL}: ${entry.spotify.artist}` } satisfies PlaybackSource]
          : []),
        ...(entry.youtube
          ? [{ kind: "official-embed", provider: "youtube", embedId: entry.youtube.id, verifiedBy: `${VERIFIED_LABEL}: ${entry.youtube.channel}` } satisfies PlaybackSource]
          : []),
      ],
      externalLinks: [
        { provider: "youtube" as const, query: `${entry.title.en} ${entry.artist.en}` },
        { provider: "spotify" as const, query: `${entry.title.en} ${entry.artist.en}` },
      ],
      sheetMusic: { status: "unavailable" as const, reason: "not-licensed" as const },
      practice: [],
      downloads: { scoreIds: [], recording: false as const },
    }));
  },
};

export const PROVIDERS: readonly CatalogProvider[] = [musicPathProvider, curatedMetadataProvider];
