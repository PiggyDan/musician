import { describe, expect, it } from "vitest";
import { detectChord } from "./chords";
import { KEY_CODE_TO_SEMITONE } from "./keyboard-map";
import {
  buildKeyboard,
  isBlackKey,
  MIDDLE_C,
  midiToFrequency,
  midiToNoteName,
  noteNameToMidi,
  offsetWhiteKeys,
} from "./notes";

describe("note mapping", () => {
  it("treats MIDI 60 as Middle C (C4)", () => {
    expect(MIDDLE_C).toBe(60);
    expect(midiToNoteName(60)).toBe("C4");
    expect(noteNameToMidi("C4")).toBe(60);
  });

  it("round-trips every key on an 88-key piano", () => {
    for (let midi = 21; midi <= 108; midi += 1) {
      expect(noteNameToMidi(midiToNoteName(midi))).toBe(midi);
    }
  });

  it("names octave boundaries correctly", () => {
    expect(midiToNoteName(59)).toBe("B3");
    expect(midiToNoteName(61)).toBe("C#4");
    expect(midiToNoteName(21)).toBe("A0");
    expect(midiToNoteName(108)).toBe("C8");
    expect(noteNameToMidi("Db4")).toBe(61);
    expect(noteNameToMidi("nonsense")).toBeNull();
  });

  it("uses A4 = 440 Hz equal temperament", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });

  it("identifies black keys", () => {
    const blacks = [61, 63, 66, 68, 70];
    for (let midi = 60; midi < 72; midi += 1) {
      expect(isBlackKey(midi)).toBe(blacks.includes(midi));
    }
  });
});

describe("buildKeyboard", () => {
  it("lays out one octave as 7 white + 5 black keys", () => {
    const keys = buildKeyboard(60, 7);
    expect(keys.filter((k) => !k.isBlack)).toHaveLength(7);
    expect(keys.filter((k) => k.isBlack)).toHaveLength(5);
    expect(keys[0].name).toBe("C4");
    expect(keys[keys.length - 1].name).toBe("B4");
  });

  it("never adds a black key past the last white key", () => {
    const keys = buildKeyboard(60, 8); // C4 … C5
    expect(keys[keys.length - 1].name).toBe("C5");
    expect(keys.some((k) => k.midi === 73)).toBe(false);
  });

  it("puts each black key on the white key to its left", () => {
    const keys = buildKeyboard(60, 7);
    const cSharp = keys.find((k) => k.midi === 61);
    const fSharp = keys.find((k) => k.midi === 66);
    expect(cSharp?.whiteIndex).toBe(0);
    expect(fSharp?.whiteIndex).toBe(3);
  });

  it("snaps a black start note down to a white key", () => {
    expect(buildKeyboard(61, 3)[0].midi).toBe(60);
  });

  it("offsets by white keys", () => {
    expect(offsetWhiteKeys(60, 7)).toBe(72);
    expect(offsetWhiteKeys(60, -4)).toBe(53); // F3
  });
});

describe("computer keyboard map", () => {
  it("maps the home row A to C and covers 17 semitones without gaps", () => {
    expect(KEY_CODE_TO_SEMITONE.KeyA).toBe(0);
    const semitones = Object.values(KEY_CODE_TO_SEMITONE).sort((a, b) => a - b);
    expect(semitones).toEqual(Array.from({ length: 17 }, (_, i) => i));
  });
});

describe("detectChord", () => {
  it("names triads and sevenths regardless of voicing", () => {
    expect(detectChord([60, 64, 67])).toBe("C");
    expect(detectChord([57, 60, 64])).toBe("Am");
    expect(detectChord([64, 67, 72])).toBe("C/E");
    expect(detectChord([60, 64, 67, 71])).toBe("Cmaj7");
    expect(detectChord([55, 59, 62, 65])).toBe("G7");
  });

  it("returns null for intervals and clusters", () => {
    expect(detectChord([60, 64])).toBeNull();
    expect(detectChord([60, 61, 62])).toBeNull();
    expect(detectChord([60, 72, 84])).toBeNull();
  });
});
