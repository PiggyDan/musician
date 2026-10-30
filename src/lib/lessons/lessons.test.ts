import { describe, expect, it } from "vitest";
import { FIRST_LIGHT, PIANO_LESSONS, SUNRISE_STEPS } from "@/content/lessons/piano";
import { lengthInBeats, melodyToTimedNotes } from "@/content/lessons/timing";
import en from "@/i18n/dictionaries/en";
import mn from "@/i18n/dictionaries/mn";
import { applyLessonCompletion, INITIAL_PROGRESS } from "@/lib/gamification/progress";
import { isBlackKey, noteLetterOf } from "@/lib/music/notes";
import { advanceSequence, matchesLetter } from "./evaluate";
import {
  BEGINNER_TOLERANCES,
  beatToMs,
  dominantProblem,
  hasPassed,
  scoreTimedPerformance,
  type ExpectedHit,
} from "./timing";

describe("note identification", () => {
  it("matches a letter in any octave", () => {
    expect(matchesLetter(62, "D")).toBe(true); // D4
    expect(matchesLetter(50, "D")).toBe(true); // D3
    expect(matchesLetter(74, "D")).toBe(true); // D5
    expect(matchesLetter(64, "D")).toBe(false);
  });

  it("never matches black keys to a white-key letter", () => {
    expect(matchesLetter(61, "C")).toBe(false); // C#4
    expect(matchesLetter(61, "D")).toBe(false);
    expect(noteLetterOf(61)).toBeNull();
    expect(noteLetterOf(71)).toBe("B");
  });
});

describe("advanceSequence", () => {
  const melody = [60, 62, 64];

  it("advances on the right note and completes at the end", () => {
    expect(advanceSequence(0, 60, melody)).toEqual({ index: 1, verdict: "correct" });
    expect(advanceSequence(1, 62, melody)).toEqual({ index: 2, verdict: "correct" });
    expect(advanceSequence(2, 64, melody)).toEqual({ index: 3, verdict: "complete" });
  });

  it("keeps progress on a wrong note instead of restarting", () => {
    expect(advanceSequence(2, 65, melody)).toEqual({ index: 2, verdict: "wrong" });
    expect(advanceSequence(2, 52, melody)).toEqual({ index: 2, verdict: "wrong" }); // right letter, wrong octave
  });

  it("is a no-op once complete", () => {
    expect(advanceSequence(3, 60, melody)).toEqual({ index: 3, verdict: "complete" });
  });

  it("plays Sunrise Steps end to end", () => {
    let index = 0;
    for (const note of SUNRISE_STEPS) index = advanceSequence(index, note, SUNRISE_STEPS).index;
    expect(index).toBe(SUNRISE_STEPS.length);
  });
});

describe("scoreTimedPerformance", () => {
  const bpm = 60; // 1 beat = 1000 ms
  const expected: ExpectedHit[] = [0, 1, 2, 3].map((beat) => ({ timeMs: beatToMs(beat, bpm), midi: 60 }));

  it("classifies perfect, good, early and late offsets", () => {
    const score = scoreTimedPerformance(
      expected,
      [
        { timeMs: 30, midi: 60 }, // +30 perfect
        { timeMs: 1150, midi: 60 }, // +150 good
        { timeMs: 1700, midi: 60 }, // -300 early
        { timeMs: 3290, midi: 60 }, // +290 late
      ],
      { matchPitch: false },
    );
    expect(score.notes.map((n) => n.status)).toEqual(["perfect", "good", "early", "late"]);
    expect(score.hits).toBe(2);
    expect(score.extras).toBe(0);
  });

  it("marks unplayed notes as missed and far-off taps as extras", () => {
    const score = scoreTimedPerformance(expected, [{ timeMs: 0, midi: 60 }, { timeMs: 1500, midi: 60 }], {
      matchPitch: false,
    });
    expect(score.notes.map((n) => n.status)).toEqual(["perfect", "missed", "missed", "missed"]);
    expect(score.extras).toBe(1);
    expect(score.matches).toEqual([0, null]);
  });

  it("counts a double tap on one beat as an extra, not a second hit", () => {
    const score = scoreTimedPerformance(expected.slice(0, 1), [{ timeMs: 0, midi: 60 }, { timeMs: 60, midi: 60 }], {
      matchPitch: false,
    });
    expect(score.hits).toBe(1);
    expect(score.extras).toBe(1);
  });

  it("ignores pitch in rhythm mode but checks it in song mode", () => {
    const plays = [{ timeMs: 0, midi: 67 }];
    expect(scoreTimedPerformance(expected.slice(0, 1), plays, { matchPitch: false }).hits).toBe(1);
    const song = scoreTimedPerformance(expected.slice(0, 1), plays, { matchPitch: true });
    expect(song.notes[0].status).toBe("wrong-pitch");
    expect(song.hits).toBe(0);
  });

  it("lets a quick correction fix a wrong pitch", () => {
    const score = scoreTimedPerformance(expected.slice(0, 1), [{ timeMs: -40, midi: 62 }, { timeMs: 90, midi: 60 }], {
      matchPitch: true,
    });
    expect(score.notes[0].status).toBe("good");
    expect(score.hits).toBe(1);
  });

  it("matches out-of-order input by time", () => {
    const score = scoreTimedPerformance(expected.slice(0, 2), [{ timeMs: 1000, midi: 60 }, { timeMs: 0, midi: 60 }], {
      matchPitch: false,
    });
    expect(score.hits).toBe(2);
    expect(score.matches).toEqual([1, 0]);
  });

  it("uses beginner-friendly tolerances", () => {
    expect(BEGINNER_TOLERANCES.goodMs).toBeGreaterThanOrEqual(150);
    expect(BEGINNER_TOLERANCES.windowMs).toBeGreaterThan(BEGINNER_TOLERANCES.goodMs);
    // Window must stay under half a beat at the fastest lesson tempo, or notes would be ambiguous.
    const fastest = Math.max(...PIANO_LESSONS.flatMap((l) => l.steps.map((s) => (s.kind === "play-timed" ? s.bpm : 0))));
    expect(BEGINNER_TOLERANCES.windowMs).toBeLessThan(beatToMs(0.5, fastest));
  });
});

describe("hasPassed and tips", () => {
  const expected: ExpectedHit[] = [0, 1, 2, 3].map((beat) => ({ timeMs: beat * 1000, midi: 60 }));

  it("passes at the ratio and fails below it", () => {
    const three = scoreTimedPerformance(expected, [0, 1000, 2000].map((t) => ({ timeMs: t, midi: 60 })), { matchPitch: false });
    expect(hasPassed(three, 0.75)).toBe(true);
    const two = scoreTimedPerformance(expected, [0, 1000].map((t) => ({ timeMs: t, midi: 60 })), { matchPitch: false });
    expect(hasPassed(two, 0.75)).toBe(false);
  });

  it("fails when the learner mashes keys", () => {
    const plays = [0, 1000, 2000, 3000, 500, 1500, 2500, 3500].map((t) => ({ timeMs: t, midi: 60 }));
    const score = scoreTimedPerformance(expected, plays, { matchPitch: false });
    expect(score.hits).toBe(4);
    expect(hasPassed(score, 0.75)).toBe(false);
  });

  it("names the most common problem", () => {
    const early = scoreTimedPerformance(expected, [-300, 700, 1700, 3000].map((t) => ({ timeMs: t, midi: 60 })), {
      matchPitch: false,
    });
    expect(dominantProblem(early)).toBe("early");
    const perfect = scoreTimedPerformance(expected, [0, 1000, 2000, 3000].map((t) => ({ timeMs: t, midi: 60 })), {
      matchPitch: false,
    });
    expect(dominantProblem(perfect)).toBeNull();
  });
});

describe("lesson content", () => {
  it("has five playable lessons with XP that sums to 85", () => {
    expect(PIANO_LESSONS).toHaveLength(5);
    expect(PIANO_LESSONS.every((l) => l.playable)).toBe(true);
    expect(PIANO_LESSONS.reduce((sum, l) => sum + l.xp, 0)).toBe(85);
    expect(PIANO_LESSONS.filter((l) => l.completesCourse).map((l) => l.id)).toEqual(["piano-5"]);
  });

  it("covers every step kind the engine supports", () => {
    const kinds = new Set(PIANO_LESSONS.flatMap((l) => l.steps.map((s) => s.kind)));
    expect([...kinds].sort()).toEqual(["explain", "find-notes", "name-notes", "play-note", "play-sequence", "play-timed"]);
  });

  it("has English and Mongolian copy for every step", () => {
    for (const step of PIANO_LESSONS.flatMap((l) => l.steps)) {
      expect(en.steps[step.copy].title).toBeTruthy();
      expect(mn.steps[step.copy].title).toBeTruthy();
    }
  });

  it("keeps melodies on white keys inside the visible keyboard", () => {
    for (const step of PIANO_LESSONS.flatMap((l) => l.steps)) {
      if (step.kind !== "play-sequence" && step.kind !== "play-timed") continue;
      const notes = step.kind === "play-sequence" ? step.notes : step.notes.map((n) => n.midi);
      for (const midi of notes) {
        expect(isBlackKey(midi)).toBe(false);
        if (step.keyboard) {
          expect(midi).toBeGreaterThanOrEqual(step.keyboard.start);
          expect(midi).toBeLessThanOrEqual(step.keyboard.start + 12);
        }
      }
    }
  });

  it("lays out First Light as 16 beats with no gaps or overlaps", () => {
    expect(lengthInBeats(FIRST_LIGHT)).toBe(16);
    FIRST_LIGHT.slice(1).forEach((note, i) => {
      expect(note.beat).toBe(FIRST_LIGHT[i].beat + FIRST_LIGHT[i].beats);
    });
    expect(melodyToTimedNotes([[60, 1], [62, 2]])).toEqual([
      { midi: 60, beat: 0, beats: 1 },
      { midi: 62, beat: 1, beats: 2 },
    ]);
  });

  it("awards each lesson's XP exactly once and unlocks the course achievement", () => {
    let state = INITIAL_PROGRESS;
    for (const lesson of PIANO_LESSONS) {
      const first = applyLessonCompletion(state, lesson.id, lesson.xp);
      expect(first.xpAwarded).toBe(lesson.xp);
      const again = applyLessonCompletion(first.next, lesson.id, lesson.xp);
      expect(again.xpAwarded).toBe(0);
      state = first.next;
    }
    expect(state.xp).toBe(85);
    expect(state.achievements["foundations-complete"]).toBeTruthy();
    expect(state.achievements["first-melody"]).toBeTruthy();
    expect(state.achievements["on-the-beat"]).toBeTruthy();
  });
});
