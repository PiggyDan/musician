import { PROVIDERS } from "./providers";
import type { CatalogProvider, ExternalSearchLink, GenreId, PlaybackSource, Song, SongQuery } from "./types";

export const GENRES: readonly GenreId[] = ["worship", "gospel", "pop", "rock", "kpop", "classical", "mongolian", "folk"];

export const EMPTY_QUERY: SongQuery = { text: "", genre: "all", instrument: "all", playableOnly: false };

/** Merges every provider's songs (first provider wins on id clashes). */
export async function loadCatalog(providers: readonly CatalogProvider[] = PROVIDERS): Promise<Song[]> {
  const seen = new Set<string>();
  const songs: Song[] = [];
  for (const provider of providers) {
    for (const song of await provider.list()) {
      if (seen.has(song.id)) continue;
      seen.add(song.id);
      songs.push(song);
    }
  }
  return songs;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** True when the song can be heard or practised on MusicPath itself. */
export function isPlayableHere(song: Song): boolean {
  return song.playback.some((p) => p.kind !== "official-embed") || song.practice.length > 0;
}

/** True when an official, verified video can be played via the platform's embed. */
export function hasOfficialVideo(song: Song): boolean {
  return song.playback.some((p) => p.kind === "official-embed" && embedUrl(p) !== null);
}

function rank(song: Song): number {
  return isPlayableHere(song) ? 2 : hasOfficialVideo(song) ? 1 : 0;
}

export function searchSongs(songs: readonly Song[], query: SongQuery): Song[] {
  const terms = normalize(query.text).split(/\s+/).filter(Boolean);
  return songs
    .filter((song) => {
      if (query.genre !== "all" && !song.metadata.genres.includes(query.genre)) return false;
      if (query.instrument !== "all" && !song.practice.some((p) => p.instrument === query.instrument)) return false;
      if (query.playableOnly && !isPlayableHere(song) && !hasOfficialVideo(song)) return false;
      if (terms.length === 0) return true;
      const m = song.metadata;
      const haystack = normalize([m.title.en, m.title.mn, m.artist.en, m.artist.mn].join(" "));
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => rank(b) - rank(a));
}

export function songSlug(id: string): string {
  return id.replace(":", "--");
}

export function songIdFromSlug(slug: string): string {
  return slug.replace("--", ":");
}

/** Embed hosts we allow, and only for entries a person has verified as official uploads. */
const EMBED_HOSTS: Record<"youtube" | "spotify", (id: string) => string> = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`,
  spotify: (id) => `https://open.spotify.com/embed/track/${encodeURIComponent(id)}`,
};

/** Builds a safe embed URL, or null when the source isn't an allow-listed, verified embed. */
export function embedUrl(source: PlaybackSource): string | null {
  if (source.kind !== "official-embed") return null;
  if (!source.verifiedBy.trim() || !/^[A-Za-z0-9_-]{6,40}$/.test(source.embedId)) return null;
  return EMBED_HOSTS[source.provider](source.embedId);
}

/** Opens a platform's own search page — no media is played or hosted by MusicPath. */
export function externalSearchUrl(link: ExternalSearchLink): string {
  const q = encodeURIComponent(link.query);
  return link.provider === "youtube" ? `https://www.youtube.com/results?search_query=${q}` : `https://open.spotify.com/search/${q}`;
}
