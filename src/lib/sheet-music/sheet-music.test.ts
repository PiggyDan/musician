import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "@/content/instruments";
import { FIRST_LIGHT, SUNRISE_STEPS } from "@/content/lessons/piano";
import { COMPOSERS, INSTRUMENT_RANGES, LICENSES, SCORES, getScore } from "@/content/sheet-music/catalog";
import {
  EMPTY_FILTERS,
  filterScores,
  filtersFromSearch,
  filtersToSearch,
  pdfPath,
  practiceTargets,
  scoreMusicXml,
  scoreNotes,
  scoreNotesTimed,
  scoreSteps,
} from "./library";
import { measureErrors, toMusicXml } from "./musicxml";
import { measureLength, parseMelody, toCursorSteps, toTimeline } from "./notation";
import { detectChord } from "@/lib/music/chords";

describe("notation parser", () => {
  it("parses pitches, rests, dots and measures", () => {
    const { events, measures } = parseMelody("C4:q F#4:8 Bb3:8 r:h | G5:h.");
    expect(measures).toHaveLength(2);
    expect(events.map((e) => e.pitches[0]?.midi ?? null)).toEqual([60, 66, 58, null, 79]);
    expect(events.map((e) => e.sixteenths)).toEqual([4, 2, 2, 8, 12]);
    expect(events[1].pitches[0]).toMatchObject({ step: "F", alter: 1, octave: 4 });
    expect(events[2].pitches[0]).toMatchObject({ step: "B", alter: -1, octave: 3 });
    expect(events[4]).toMatchObject({ dotted: true, measure: 1 });
  });

  it("rejects malformed tokens", () => {
    expect(() => parseMelody("C4:x")).toThrow(/Invalid notation token/);
    expect(() => parseMelody("H4:q")).toThrow();
  });

  it("builds a timeline in quarter-note beats", () => {
    expect(toTimeline(parseMelody("C4:q D4:8 r:8 E4:h").events)).toEqual([
      { midis: [60], start: 0, beats: 1 },
      { midis: [62], start: 1, beats: 0.5 },
      { midis: [], start: 1.5, beats: 0.5 },
      { midis: [64], start: 2, beats: 2 },
    ]);
  });

  it("parses chords written with +", () => {
    const { events } = parseMelody("C3+E3+G3:w | B2+D3+G3:h r:h");
    expect(events[0].pitches.map((p) => p.midi)).toEqual([48, 52, 55]);
    expect(events[1].pitches.map((p) => p.midi)).toEqual([47, 50, 55]);
    expect(events[2].pitches).toEqual([]);
  });

  it("merges two staves into cursor steps at every distinct onset", () => {
    const steps = toCursorSteps([
      toTimeline(parseMelody("C4:q D4:q E4:h").events),
      toTimeline(parseMelody("C3:h r:h").events),
    ]);
    expect(steps.map((s) => s.start)).toEqual([0, 1, 2]);
    expect(steps[0].notes.map((n) => [n.midi, n.staff])).toEqual([[60, 1], [48, 2]]);
    expect(steps[2].notes.map((n) => n.midi)).toEqual([64]); // the rest starts here too, but has no notes
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

  it("writes a grand staff: two staves, backup, chords and a bass clef", () => {
    const grand = toMusicXml({
      title: "Grand",
      composer: "X",
      partName: "Piano",
      keyFifths: 0,
      time: [4, 4],
      tempo: 80,
      clef: "treble",
      melody: "E4:q D4:q C4:h",
      bass: "C3+E3+G3:w",
    });
    expect(grand).toContain("<staves>2</staves>");
    expect(grand).toContain('<clef number="2"><sign>F</sign><line>4</line></clef>');
    expect(grand).toContain("<backup><duration>16</duration></backup>");
    expect(grand.match(/<chord\/>/g)?.length).toBe(2);
    expect(grand).toContain("<staff>2</staff>");
    expect(() =>
      toMusicXml({ title: "", composer: "", partName: "", keyFifths: 0, time: [4, 4], tempo: 60, clef: "treble", melody: "C4:w | C4:w", bass: "C3:w" }),
    ).toThrow(/different measure counts/);
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
    if (score.bass) {
      expect(score.instrument).toBe("piano");
      expect(measureErrors(score.bass, score.time, score.pickup)).toEqual([]);
      expect(parseMelody(score.bass).measures.length).toBe(parseMelody(score.melody).measures.length);
    }
    const [lo, hi] = INSTRUMENT_RANGES[score.instrument];
    for (const midi of scoreNotesTimed(score).map((n) => n.midi)) {
      expect(midi).toBeGreaterThanOrEqual(lo);
      expect(midi).toBeLessThanOrEqual(hi);
    }
    expect(scoreMusicXml(score)).toContain(score.title.en.replace(/&/g, "&amp;"));
  });

  it("matches the lesson melodies for the MusicPath originals", () => {
    expect(scoreNotes(getScore("sunrise-steps-piano")!)).toEqual([...SUNRISE_STEPS]);
    expect(scoreNotesTimed(getScore("first-light-piano")!).map((e) => [e.midi, e.start, e.beats])).toEqual(
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

describe("two-hand scores", () => {
  const twoHand = SCORES.filter((s) => s.bass);

  it("includes grand-staff piano arrangements linked to lessons", () => {
    expect(twoHand.map((s) => s.id).sort()).toEqual(["first-light-both-hands", "ode-to-joy-both-hands", "twinkle-both-hands"]);
    for (const s of twoHand) expect(s.relatedLesson).toBeTruthy();
  });

  it("left-hand chords are real major triads", () => {
    const ode = getScore("ode-to-joy-both-hands")!;
    const chords = parseMelody(ode.bass!).events.map((e) => detectChord(e.pitches.map((p) => p.midi)));
    expect(new Set(chords)).toEqual(new Set(["C", "G/B"]));
  });

  it("lets each hand practise separately", () => {
    const steps = scoreSteps(getScore("first-light-both-hands")!);
    const both = practiceTargets(steps, "both");
    const right = practiceTargets(steps, "right");
    const left = practiceTargets(steps, "left");
    expect(both[0].midis).toEqual([48, 60]);
    expect(right.map((t) => t.midis.length).every((n) => n === 1)).toBe(true);
    expect(left.map((t) => t.midis[0])).toEqual([48, 55, 48, 55, 48]);
    expect(right).toHaveLength(12);
  });
});

describe("filter URLs", () => {
  it("round-trips filters through the query string", () => {
    const filters = { ...EMPTY_FILTERS, query: "ode", instrument: "piano" as const, difficulty: "elementary" as const };
    expect(filtersToSearch(filters)).toBe("?q=ode&instrument=piano&difficulty=elementary");
    expect(filtersFromSearch(filtersToSearch(filters))).toEqual(filters);
    expect(filtersToSearch(EMPTY_FILTERS)).toBe("");
  });

  it("ignores unknown values", () => {
    expect(filtersFromSearch("?instrument=banjo&genre=metal&composer=nobody")).toEqual(EMPTY_FILTERS);
  });
});

describe("filterScores", () => {
  it("returns everything with no filters", () => {
    expect(filterScores(SCORES, EMPTY_FILTERS)).toHaveLength(SCORES.length);
  });

  it("filters by instrument, difficulty, genre and composer", () => {
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, instrument: "harmonica" }).every((s) => s.instrument === "harmonica")).toBe(true);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, difficulty: "elementary" }).map((s) => s.id).sort()).toEqual(
      ["amazing-grace-harmonica", "minuet-in-g-piano", "minuet-in-g-violin", "ode-to-joy-both-hands", "twinkle-both-hands"],
    );
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, genre: "hymn" }).map((s) => s.id)).toEqual(["amazing-grace-harmonica"]);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, composer: "beethoven", instrument: "cello" }).map((s) => s.id)).toEqual(["ode-to-joy-cello"]);
  });

  it("searches titles and composers in both languages, ignoring case and accents", () => {
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "frere" }).map((s) => s.id)).toEqual(["frere-jacques-guitar"]);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "BEETHOVEN" })).toHaveLength(3);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "Бетховен" })).toHaveLength(3);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "од" }).some((s) => s.id === "twinkle-piano")).toBe(true);
    expect(filterScores(SCORES, { ...EMPTY_FILTERS, query: "no such song" })).toEqual([]);
  });
});
