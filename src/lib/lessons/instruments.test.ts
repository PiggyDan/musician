import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "@/content/instruments";
import { LAYOUTS } from "@/content/instrument-layouts";
import { getCourse, getLesson, INSTRUMENT_LESSONS } from "@/content/lessons/instruments";
import en from "@/i18n/dictionaries/en";
import mn from "@/i18n/dictionaries/mn";
import { midiToNoteName } from "@/lib/music/notes";

const OPEN_STRINGS = {
  guitar: ["E2", "A2", "D3", "G3", "B3", "E4"],
  ukulele: ["G4", "C4", "E4", "A4"],
  violin: ["G3", "D4", "A4", "E5"],
  cello: ["C2", "G2", "D3", "A3"],
};

describe("instrument layouts", () => {
  it("use the standard tunings", () => {
    for (const [id, names] of Object.entries(OPEN_STRINGS)) {
      const layout = LAYOUTS[id as keyof typeof OPEN_STRINGS];
      if (layout.kind !== "strings") throw new Error(id);
      expect(layout.strings.map((s) => midiToNoteName(s.open)), id).toEqual(names);
    }
  });

  it("models a C diatonic harmonica (Richter tuning)", () => {
    const h = LAYOUTS.harmonica;
    if (h.kind !== "harmonica") throw new Error();
    expect(h.blow.map(midiToNoteName)).toEqual(["C4", "E4", "G4", "C5", "E5", "G5", "C6", "E6", "G6", "C7"]);
    expect(h.draw.map(midiToNoteName)).toEqual(["D4", "G4", "B4", "D5", "F5", "A5", "B5", "D6", "F6", "A6"]);
  });
});

describe("instrument lessons", () => {
  it("every academy instrument is available with lessons", () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.available).toBe(true);
      expect(getCourse(instrument.id).length).toBeGreaterThanOrEqual(2);
    }
    expect(getLesson("guitar", "1")?.id).toBe("guitar-1");
  });

  it("labels match the pitch actually played (string·position or hole↑↓)", () => {
    for (const [instrument, lessons] of Object.entries(INSTRUMENT_LESSONS)) {
      const layout = LAYOUTS[instrument as keyof typeof LAYOUTS];
      for (const step of lessons.flatMap((l) => l.steps)) {
        if (step.kind !== "play-sequence") continue;
        expect(step.instrument).toBe(instrument);
        step.notes.forEach((midi, i) => {
          const label = String(step.fingers![i]);
          if (layout.kind === "harmonica") {
            const [, hole, arrow] = /^(\d+)([↑↓])$/.exec(label)!;
            const expected = (arrow === "↑" ? layout.blow : layout.draw)[Number(hole) - 1];
            expect(midi, label).toBe(expected);
          } else {
            const [name, n] = label.split("·");
            const string = layout.strings.find((s) => s.name === name)!;
            expect(midi, label).toBe(string.open + Number(n));
            expect(Number(n)).toBeLessThan(layout.positions);
          }
        });
      }
    }
  });

  it("first lessons play every open string, low to high", () => {
    for (const [instrument, names] of Object.entries(OPEN_STRINGS)) {
      const step = INSTRUMENT_LESSONS[instrument as keyof typeof OPEN_STRINGS][0].steps.find((s) => s.kind === "play-sequence");
      expect(step?.kind === "play-sequence" && step.notes.map((n) => midiToNoteName(n as number))).toEqual(names);
    }
  });

  it("tunes are the right melodies", () => {
    const tune = (instrument: keyof typeof INSTRUMENT_LESSONS) => {
      const step = INSTRUMENT_LESSONS[instrument][1].steps.find((s) => s.kind === "play-sequence");
      return step?.kind === "play-sequence" ? step.notes.map((n) => midiToNoteName(n as number).replace(/\d/, "")) : [];
    };
    expect(tune("guitar")).toEqual(["C", "D", "E", "C", "C", "D", "E", "C"]); // Frère Jacques
    expect(tune("ukulele")).toEqual(["C", "C", "G", "G", "A", "A", "G"]); // Twinkle
    expect(tune("violin")).toEqual(["C", "C", "C", "D", "E", "D"]); // Au clair de la lune
    expect(tune("cello")).toEqual(["E", "E", "F", "G", "G", "F", "E", "D"]); // Ode to Joy
    expect(tune("harmonica")).toEqual(["E", "D", "C", "E", "D", "C"]); // Hot Cross Buns
  });

  it("has English and Mongolian copy for every lesson and step", () => {
    for (const lesson of Object.values(INSTRUMENT_LESSONS).flat()) {
      expect(en.lessons[lesson.i18nKey].title && mn.lessons[lesson.i18nKey].title).toBeTruthy();
      for (const step of lesson.steps) expect(en.steps[step.copy].title && mn.steps[step.copy].title).toBeTruthy();
    }
  });
});
