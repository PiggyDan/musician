import { describe, expect, it } from "vitest";
import { SCORES } from "@/content/sheet-music/catalog";
import { getPianoLesson } from "@/content/lessons/piano";
import { curatedMetadataProvider, musicPathProvider } from "./providers";
import {
  EMPTY_QUERY,
  embedUrl,
  externalSearchUrl,
  GENRES,
  hasOfficialVideo,
  isPlayableHere,
  loadCatalog,
  searchSongs,
  songIdFromSlug,
  songSlug,
} from "./service";
import type { CatalogProvider, Song } from "./types";

describe("song catalog", () => {
  it("merges providers and covers every required genre", async () => {
    const songs = await loadCatalog();
    expect(songs.length).toBeGreaterThanOrEqual(25);
    for (const genre of ["worship", "gospel", "pop", "rock", "kpop", "classical", "mongolian"] as const) {
      expect(songs.some((s) => s.metadata.genres.includes(genre)), genre).toBe(true);
    }
    expect(new Set(songs.map((s) => s.id)).size).toBe(songs.length);
    for (const s of songs) for (const g of s.metadata.genres) expect(GENRES).toContain(g);
  });

  it("links every public-domain and original score to a song", async () => {
    const songs = await musicPathProvider.list();
    const linked = new Set(songs.flatMap((s) => (s.sheetMusic.status === "available" ? s.sheetMusic.scoreIds : [])));
    for (const score of SCORES) expect(linked.has(score.id), score.id).toBe(true);
  });

  it("only offers playback, sheet music and downloads where rights allow", async () => {
    const songs = await loadCatalog();
    for (const song of songs) {
      expect(song.downloads.recording).toBe(false);
      if (song.rights === "metadata-only") {
        // Only verified official embeds — never audio we host.
        for (const p of song.playback) {
          expect(p.kind, song.id).toBe("official-embed");
          expect(embedUrl(p), song.id).toMatch(/^https:\/\/(www\.youtube-nocookie\.com\/embed\/|open\.spotify\.com\/embed\/track\/)/);
        }
        expect(song.practice).toEqual([]);
        expect(song.downloads.scoreIds).toEqual([]);
        expect(song.sheetMusic).toEqual({ status: "unavailable", reason: "not-licensed" });
        expect(isPlayableHere(song)).toBe(false);
      } else {
        expect(song.playback.every((p) => p.kind === "musicpath-performance")).toBe(true);
        expect(song.sheetMusic.status).toBe("available");
      }
      for (const p of song.practice) if (p.relatedLesson) expect(getPianoLesson(p.relatedLesson)).toBeDefined();
    }
  });

  it("first provider wins on id clashes", async () => {
    const song = (await curatedMetadataProvider.list())[0];
    const dupe: CatalogProvider = { id: "x", name: "x", list: async () => [{ ...song, provider: "x" } as Song] };
    const merged = await loadCatalog([curatedMetadataProvider, dupe]);
    expect(merged.filter((s) => s.id === song.id)).toHaveLength(1);
    expect(merged.find((s) => s.id === song.id)?.provider).toBe("curated");
  });
});

describe("searchSongs", () => {
  it("searches titles and artists, filters by genre, instrument and playability", async () => {
    const songs = await loadCatalog();
    expect(searchSongs(songs, { ...EMPTY_QUERY, text: "the hu" }).map((s) => s.id)).toEqual(["curated:wolf-totem", "curated:yuve-yuve-yu"]);
    expect(searchSongs(songs, { ...EMPTY_QUERY, text: "чонон" }).map((s) => s.id)).toEqual(["curated:wolf-totem"]);
    expect(searchSongs(songs, { ...EMPTY_QUERY, genre: "worship" }).some((s) => s.id === "musicpath:amazing-grace")).toBe(true);
    expect(searchSongs(songs, { ...EMPTY_QUERY, instrument: "cello" }).map((s) => s.id)).toEqual(["musicpath:ode-to-joy"]);
    const playable = searchSongs(songs, { ...EMPTY_QUERY, playableOnly: true });
    expect(playable.every((song) => isPlayableHere(song) || hasOfficialVideo(song))).toBe(true);
    expect(playable.some((song) => song.id === "curated:wolf-totem")).toBe(true); // official video
    expect(playable.some((song) => song.id === "curated:way-maker")).toBe(false); // no verified upload
    const shape = songs.find((song) => song.id === "curated:shape-of-you")!;
    expect(shape.playback[0]).toMatchObject({ kind: "official-embed", provider: "spotify" }); // audio first
    expect(searchSongs(songs, EMPTY_QUERY)[0].rights).not.toBe("metadata-only"); // playable first
  });
});

describe("playback safety", () => {
  it("only builds embeds for verified, allow-listed sources", () => {
    expect(embedUrl({ kind: "official-embed", provider: "youtube", embedId: "abcDEF12345", verifiedBy: "editor 2026-10-30" })).toBe(
      "https://www.youtube-nocookie.com/embed/abcDEF12345",
    );
    expect(embedUrl({ kind: "official-embed", provider: "youtube", embedId: "abcDEF12345", verifiedBy: " " })).toBeNull();
    expect(embedUrl({ kind: "official-embed", provider: "spotify", embedId: "../evil", verifiedBy: "x" })).toBeNull();
    expect(embedUrl({ kind: "musicpath-performance", scoreId: "x" })).toBeNull();
  });

  it("external links only open official search pages", () => {
    expect(externalSearchUrl({ provider: "youtube", query: "Way Maker Sinach" })).toBe("https://www.youtube.com/results?search_query=Way%20Maker%20Sinach");
    expect(externalSearchUrl({ provider: "spotify", query: "Dynamite BTS" })).toBe("https://open.spotify.com/search/Dynamite%20BTS");
  });

  it("round-trips song ids through URL slugs", () => {
    expect(songIdFromSlug(songSlug("musicpath:ode-to-joy"))).toBe("musicpath:ode-to-joy");
    expect(songSlug("curated:10000-reasons")).toBe("curated--10000-reasons");
  });
});
