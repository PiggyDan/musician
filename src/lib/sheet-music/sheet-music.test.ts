import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "@/content/instruments";
import { FIRST_LIGHT, SUNRISE_STEPS } from "@/content/lessons/piano";
import { COMPOSERS, INSTRUMENT_RANGES, LICENSES, SCORES, getScore } from "@/content/sheet-music/catalog";
import { EMPTY_FILTERS, filterScores, pdfPath, scoreMusicXml, scoreNotes, scoreTimeline } from "./library";
import { measureErrors, toMusicXml } from "./musicxml";
import { measureLength, parseMelody, toTimeline } from "./notation";

describe("notation parser", () => {
  it("parses pitches, rests, dots and measures", () => {
    const { events, measures } = parseMelody("C4:q F#4:8 Bb3:8 r:h | G5:h.");
    expect(measures).toHaveLength(2);
    expect(events.map((e) => e.midi)).toEqual([60, 66, 58, null, 79]);
    expect(events.map((e) => e.sixteenths)).toEqual([4, 2, 2, 8, 12]);
    expect(events[1]).toMatchObject({ step: "F", alter: 1, octave: 4 });
    expect(events[2]).toMatchObject({ step: "B", alter: -1, octave: 3 });
    expect(events[4]).toMatchObject({ dotted: true, measure: 1 });
  });

  it("rejects malformed tokens", () => {
    expect(() => parseMelody("C4:x")).toThrow(/Invalid notation token/);
    expect(() => parseMelody("H4:q")).toThrow();
  });

  it("builds a timeline in quarter-note beats", () => {
    expect(toTimeline(parseMelody("C4:q D4:8 r:8 E4:h").events)).toEqual([
      { midi: 60, start: 0, beats: 1 },
      { midi: 62, start: 1, beats: 0.5 },
      { midi: null, start: 1.5, beats: 0.5 },
      { midi: 64, start: 2, beats: 2 },
    ]);
  });

  it("knows measure lengths", () => {
    expect(measureLength([4, 4])).toBe(16);
    expect(measureLength([3, 4])).toBe(12);
    expect(measureLength([6, 8])).toBe(12);
  });
});

describe("MusicXML generation", () => {
  const xml = toMusicXml({
    title: "Test & <Title>",
    composer: "Someone",
    partName: "Guitar",
    rights: "CC0",
    keyFifths: 1,
    time: [3, 4],
    tempo: 90,
    clef: "treble-8vb",
    pickup: true,
    melody: "G3:q | F#3:h. | C3:h r:q",
  });

  it("produces a MusicXML 4.0 partwise document with escaped metadata", () => {
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('<score-partwise version="4.0">');
    expect(xml).toContain("<work-title>Test &amp; &lt;Title&gt;</work-title>");
    expect(xml).toContain("<rights>CC0</rights>");
    expect(xml).toContain("<fifths>1</fifths>");
    expect(xml).toContain("<beats>3</beats><beat-type>4</beat-type>");
    expect(xml).toContain('<sound tempo="90"/>');
  });

  it("writes guitar parts an octave up with an octave clef", () => {
    expect(xml).toContain("<clef-octave-change>-1</clef-octave-change>");
    expect(xml).toContain("<step>G</step><octave>4</octave>"); // sounding G3
    expect(xml).toContain("<step>F</step><alter>1</alter><octave>4</octave>");
  });

  it("numbers a pickup as an implicit measure 0 and ends with a final barline", () => {
    expect(xml).toContain('<measure number="0" implicit="yes">');
    expect(xml).toContain('<measure number="2">');
    expect(xml).toContain("<bar-style>light-heavy</bar-style>");
    expect(xml).toContain("<rest/><duration>4</duration>");
    expect(xml).toContain("<type>half</type><dot/>");
  });

  it("omits the rights element for on-screen rendering only", () => {
    const score = getScore("ode-to-joy-piano")!;
    expect(scoreMusicXml(score)).toContain("<rights>");
    expect(scoreMusicXml(score, { forDisplay: true })).not.toContain("<rights>");
  });

  it("is well-formed (balanced tags)", () => {
    const opens = xml.match(/<([a-z-]+)(?:\s[^>]*)?(?<!\/)>/g)?.filter((t) => !t.startsWith("<?") && !t.startsWith("<!")) ?? [];
    const closes = xml.match(/<\/[a-z-]+>/g) ?? [];
    expect(opens.length).toBe(closes.length);
  });
});

describe("catalog", () => {
  it("has a reasonable, honest number of scores with unique ids", () => {
    expect(SCORES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(SCORES.map((s) => s.id)).size).toBe(SCORES.length);
    expect(getScore("ode-to-joy-piano")?.composer).toBe("beethoven");
  });

  it("covers every instrument in the academy", () => {
    const covered = new Set(SCORES.map((s) => s.instrument));
    for (const instrument of INSTRUMENTS) expect(covered.has(instrument.id)).toBe(true);
  });

  it.each(SCORES.map((s) => [s.id, s] as const))("%s has complete metadata and licensing", (_, score) => {
    expect(score.title.en && score.title.mn).toBeTruthy();
    expect(COMPOSERS[score.composer]).toBeDefined();
    expect(score.source.en.length).toBeGreaterThan(20);
    expect(score.source.mn.length).toBeGreaterThan(10);
    expect(score.compositionStatus.en).toMatch(/Public domain|Original MusicPath/);
    expect(LICENSES[score.license].url).toMatch(/^https:\/\/creativecommons\.org\//);
    expect(score.attribution).toBeTruthy();
    expect(score.formats).toContain("musicxml");
    // Only MusicPath originals may carry an attribution licence; transcriptions of PD works are CC0.
    if (score.composer === "musicpath") expect(score.license).toBe("cc-by-4.0");
    else expect(score.license).toBe("cc0");
  });

  it.each(SCORES.map((s) => [s.id, s] as const))("%s fills every measure and stays in range", (_, score) => {
    expect(measureErrors(score.melody, score.time, score.pickup)).toEqual([]);
    const [lo, hi] = INSTRUMENT_RANGES[score.instrument];
    for (const midi of scoreNotes(score)) {
      expect(midi).toBeGreaterThanOrEqual(lo);
      expect(midi).toBeLessThanOrEqual(hi);
    }
    expect(scoreMusicXml(score)).toContain(score.title.en.replace(/&/g, "&amp;"));
  });

  it("matches the lesson melodies for the MusicPath originals", () => {
    expect(scoreNotes(getScore("sunrise-steps-piano")!)).toEqual([...SUNRISE_STEPS]);
    expect(scoreTimeline(getScore("first-light-piano")!).map((e) => [e.midi, e.start, e.beats])).toEqual(
      FIRST_LIGHT.map((n) => [n.midi, n.beat, n.beats]),
    );
  });

  it("ships a real PDF for every score that lists the PDF format", () => {
    for (const score of SCORES.filter((s) => s.formats.includes("pdf"))) {
      const file = path.join(process.cwd(), "public", pdfPath(score));
      expect(existsSync(file), `${file} missing — run npm run pdfs`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(10_000);
    }
  });

  it("writes the cello part an octave below the piano part", () => {
    const piano = scoreNotes(getScore("ode-to-joy-piano")!);
    const cello = scoreNotes(getScore("ode-to-joy-cello")!);
    expect(cello).toEqual(piano.map((m) => m - 12));
  });
});

describe("filterScores", () => {
  it("returns everything with no filters", () => {
    expect(filterScores(SCORES, EMPTY_FILTERS)).toHaveLength(SCORES.length);
  });

  it("filters by instrument, difficulty, genre and composer", () => {
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, instrument: "harmonica" }).every((s) => s.instrument === "harmonica")).toBe(true);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, difficulty: "elementary" }).map((s) => s.id).sort()).toEqual(
      ["amazing-grace-harmonica", "minuet-in-g-piano", "minuet-in-g-violin"],
    );
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, genre: "hymn" }).map((s) => s.id)).toEqual(["amazing-grace-harmonica"]);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, composer: "beethoven", instrument: "cello" }).map((s) => s.id)).toEqual(["ode-to-joy-cello"]);
  });

  it("searches titles and composers in both languages, ignoring case and accents", () => {
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "frere" }).map((s) => s.id)).toEqual(["frere-jacques-guitar"]);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "BEETHOVEN" })).toHaveLength(2);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "Бетховен" })).toHaveLength(2);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "од" }).some((s) => s.id === "twinkle-piano")).toBe(true);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "no such song" })).toEqual([]);
  });
});
