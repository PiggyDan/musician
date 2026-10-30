import { describe, expect, it } from "vitest";
import { FIRST_LIGHT, PIANO_LESSONS, SUNRISE_STEPS } from "@/content/lessons/piano";
import { lengthInBeats, melodyToTimedNotes } from "@/content/lessons/timing";
import en from "@/i18n/dictionaries/en";
import mn from "@/i18n/dictionaries/mn";
import { applyLessonCompletion, INITIAL_PROGRESS } from "@/lib/gamification/progress";
import { detectChord } from "@/lib/music/chords";
import { isBlackKey, noteLetterOf, offsetWhiteKeys, pitchClass, pitchClassName } from "@/lib/music/notes";
import { diatonicIndex, staffPosition } from "@/lib/music/staff";
import type { LessonStep } from "@/content/lessons/types";
import { addPracticeMinute, currentStreak, dateKey, minuteKey, recentDays, shiftDays } from "@/lib/gamification/practice";
import { applyPracticeActivity, applyDailyGoal } from "@/lib/gamification/progress";
import { advanceSequence, chordRole, evaluateHeld, matchesLetter } from "./evaluate";
import {
  BEGINNER_TOLERANCES,
  beatToMs,
  dominantProblem,
  estimateLatency,
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
  it("has ten playable lessons in two units (85 + 100 XP)", () => {
    expect(PIANO_LESSONS).toHaveLength(10);
    expect(PIANO_LESSONS.every((l) => l.playable)).toBe(true);
    expect(PIANO_LESSONS.filter((l) => l.unit === 1).reduce((sum, l) => sum + l.xp, 0)).toBe(85);
    expect(PIANO_LESSONS.filter((l) => l.unit === 2).reduce((sum, l) => sum + l.xp, 0)).toBe(100);
    expect(PIANO_LESSONS.filter((l) => l.completesUnit).map((l) => l.id)).toEqual(["piano-5", "piano-10"]);
    expect(PIANO_LESSONS.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("covers every step kind the engine supports", () => {
    const kinds = new Set(PIANO_LESSONS.flatMap((l) => l.steps.map((s) => s.kind)));
    expect([...kinds].sort()).toEqual([
      "explain",
      "find-notes",
      "name-notes",
      "play-chords",
      "play-note",
      "play-sequence",
      "play-timed",
      "read-notes",
    ]);
  });

  it("has English and Mongolian copy for every step", () => {
    for (const step of PIANO_LESSONS.flatMap((l) => l.steps)) {
      expect(en.steps[step.copy].title).toBeTruthy();
      expect(mn.steps[step.copy].title).toBeTruthy();
    }
  });

  it("only asks for white keys that are visible even on a phone", () => {
    const PHONE_FIT = 9; // white keys that fit 343 px at 36 px each
    for (const step of PIANO_LESSONS.flatMap((l) => l.steps)) {
      const notes = stepNotes(step);
      if (notes.length === 0) continue;
      for (const midi of notes) expect(isBlackKey(midi), `${step.copy}: ${midi}`).toBe(false);
      const keyboard = "keyboard" in step ? step.keyboard : undefined;
      if (!keyboard) continue; // default keyboard: lesson 1–2 single notes around Middle C
      const visible = keyboard.fitAll ? keyboard.whiteKeys : Math.min(keyboard.whiteKeys, PHONE_FIT);
      const top = offsetWhiteKeys(keyboard.start, visible - 1);
      for (const midi of notes) {
        expect(midi, `${step.copy}: ${midi} below range`).toBeGreaterThanOrEqual(keyboard.start);
        expect(midi, `${step.copy}: ${midi} above range`).toBeLessThanOrEqual(top);
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
    expect(state.xp).toBe(185);
    expect(state.achievements["foundations-complete"]).toBeTruthy();
    expect(state.achievements["first-melody"]).toBeTruthy();
    expect(state.achievements["on-the-beat"]).toBeTruthy();
    expect(state.achievements["staff-reader"]).toBeTruthy();
    expect(state.achievements["chord-builder"]).toBeTruthy();
    expect(state.achievements["both-hands"]).toBeTruthy();
  });
});

/** Every pitch a step asks the learner to play. */
function stepNotes(step: LessonStep): number[] {
  switch (step.kind) {
    case "play-note":
      return [step.target];
    case "read-notes":
      return [...step.notes];
    case "play-chords":
      return step.chords.flatMap((c) => [...c.notes]);
    case "play-sequence":
      return step.notes.flatMap((n) => (typeof n === "number" ? [n] : [...n]));
    case "play-timed":
      return step.notes.map((n) => n.midi);
    default:
      return [];
  }
}

const allSteps = PIANO_LESSONS.flatMap((l) => l.steps);

describe("chords: evaluation", () => {
  it("names chord tones by role, in any octave or inversion", () => {
    expect(chordRole(60, 60)).toBe("root");
    expect(chordRole(64, 60)).toBe("third");
    expect(chordRole(67, 48)).toBe("fifth");
    expect(chordRole(57, 41)).toBe("third"); // A in F major
    expect(chordRole(48, 41)).toBe("fifth"); // C in F major (inversion bass)
    expect(chordRole(62, 60)).toBe("other");
  });

  it("requires all chord notes and no stray ones", () => {
    expect(evaluateHeld([60, 64, 67], [60, 64, 67]).status).toBe("complete");
    expect(evaluateHeld([67, 60], [60, 64, 67])).toEqual({ status: "partial", missing: [64], wrong: [] });
    expect(evaluateHeld([60, 64, 65], [60, 64, 67])).toEqual({ status: "wrong", missing: [67], wrong: [65] });
    expect(evaluateHeld([48, 60], [48, 60]).status).toBe("complete"); // hands together
  });
});

describe("musical accuracy of lesson content", () => {
  const chordSteps = allSteps.filter((s): s is Extract<LessonStep, { kind: "play-chords" }> => s.kind === "play-chords");

  it("every chord is the named major triad (root, major third, perfect fifth)", () => {
    for (const step of chordSteps) {
      for (const chord of step.chords) {
        expect(pitchClassName(chord.root)).toBe(chord.name);
        const intervals = [...new Set(chord.notes.map((m) => (((m - chord.root) % 12) + 12) % 12))].sort((a, b) => a - b);
        expect(intervals, chord.name).toEqual([0, 4, 7]);
        const detected = detectChord(chord.notes);
        expect(detected?.split("/")[0], chord.name).toBe(chord.name);
      }
    }
  });

  it("left-hand I–IV–V shapes keep the hand in C position (inversions)", () => {
    const shapes = chordSteps.find((s) => s.copy === "l10Shapes")!.chords;
    expect(shapes.map((c) => detectChord(c.notes))).toEqual(["C", "F/C", "G/B", "C"]);
    // Good voice leading: matching voices (low/middle/high) move at most two white keys.
    for (let i = 1; i < shapes.length; i += 1) {
      const from = [...shapes[i - 1].notes].sort((a, b) => a - b);
      const to = [...shapes[i].notes].sort((a, b) => a - b);
      from.forEach((m, v) => expect(Math.abs(diatonicIndex(to[v]) - diatonicIndex(m))).toBeLessThanOrEqual(2));
    }
    // …and the hand never leaves A2–A3.
    for (const c of shapes) for (const m of c.notes) expect(m >= 45 && m <= 57).toBe(true);
  });

  it("uses correct C-position fingering: RH thumb on C, LH pinky on C", () => {
    for (const step of allSteps) {
      if (step.kind !== "play-sequence" || !step.fingers) continue;
      expect(step.fingers.length).toBe(step.notes.length);
      step.notes.forEach((entry, i) => {
        const midi = entry as number;
        const fromC = ["C", "D", "E", "F", "G"].indexOf(pitchClassName(midi));
        expect(fromC, `${step.copy}: ${pitchClassName(midi)} is outside C position`).toBeGreaterThanOrEqual(0);
        const leftHand = midi < 60;
        expect(step.fingers![i], `${step.copy} note ${i}`).toBe(leftHand ? 5 - fromC : fromC + 1);
      });
    }
  });

  it("reading exercises stay on or near their own staff", () => {
    for (const step of allSteps) {
      if (step.kind !== "read-notes") continue;
      for (const midi of step.notes) {
        const pos = staffPosition(midi, step.clef);
        if (pos.kind === "ledger-below" || pos.kind === "ledger-above") expect(pos.count).toBe(1);
        if (step.clef === "treble") expect(midi).toBeGreaterThanOrEqual(60);
        else expect(midi).toBeLessThanOrEqual(60);
      }
    }
  });

  it("hands-together material: left hand below Middle C, both hands the same length", () => {
    for (const step of allSteps) {
      if (step.kind !== "play-timed" || !step.notes.some((n) => n.hand === "left")) continue;
      for (const n of step.notes) {
        if (n.hand === "left") expect(n.midi, step.copy).toBeLessThan(60);
        if (n.hand === "right") expect(n.midi, step.copy).toBeGreaterThanOrEqual(60);
      }
      const right = step.notes.filter((n) => n.hand === "right");
      const left = step.notes.filter((n) => n.hand === "left");
      if (right.length > 0) expect(lengthInBeats(right)).toBe(lengthInBeats(left));
      expect(lengthInBeats(step.notes) % step.beatsPerBar).toBe(0);
    }
  });

  it("left-hand bass notes and chords agree with the melody's harmony", () => {
    // Under every right-hand note, the sounding left-hand chord (or bass note) must
    // contain that note, or the note must be a step away from a chord tone (passing).
    for (const step of allSteps) {
      if (step.kind !== "play-timed" || step.mode !== "song") continue;
      const left = step.notes.filter((n) => n.hand === "left");
      const right = step.notes.filter((n) => n.hand === "right");
      if (left.length === 0 || right.length === 0) continue;
      for (const note of right) {
        const under = left.filter((l) => l.beat <= note.beat && note.beat < l.beat + l.beats).map((l) => pitchClass(l.midi));
        expect(under.length, `${step.copy} beat ${note.beat}`).toBeGreaterThan(0);
        const triad = new Set(under.flatMap((pc) => (under.length === 1 ? [pc, (pc + 4) % 12, (pc + 7) % 12] : [pc])));
        const pc = pitchClass(note.midi);
        const near = [...triad].some((t) => [1, 2, 10, 11].includes((((pc - t) % 12) + 12) % 12));
        expect(triad.has(pc) || near, `${step.copy} beat ${note.beat}`).toBe(true);
      }
    }
  });
});

describe("staffPosition", () => {
  it("places treble notes the way musicians count them", () => {
    expect(staffPosition(60, "treble")).toEqual({ kind: "ledger-below", count: 1 }); // Middle C
    expect(staffPosition(62, "treble")).toEqual({ kind: "below" }); // D4
    expect(staffPosition(64, "treble")).toEqual({ kind: "line", number: 1 }); // E4
    expect(staffPosition(65, "treble")).toEqual({ kind: "space", number: 1 }); // F4
    expect(staffPosition(67, "treble")).toEqual({ kind: "line", number: 2 }); // G4 — the G clef line
    expect(staffPosition(72, "treble")).toEqual({ kind: "space", number: 3 }); // C5
    expect(staffPosition(77, "treble")).toEqual({ kind: "line", number: 5 }); // F5
    expect(staffPosition(81, "treble")).toEqual({ kind: "ledger-above", count: 1 }); // A5
  });

  it("places bass notes, with Middle C on the ledger line above", () => {
    expect(staffPosition(43, "bass")).toEqual({ kind: "line", number: 1 }); // G2
    expect(staffPosition(48, "bass")).toEqual({ kind: "space", number: 2 }); // C3
    expect(staffPosition(53, "bass")).toEqual({ kind: "line", number: 4 }); // F3 — the F clef line
    expect(staffPosition(57, "bass")).toEqual({ kind: "line", number: 5 }); // A3
    expect(staffPosition(60, "bass")).toEqual({ kind: "ledger-above", count: 1 }); // Middle C
  });
});

describe("estimateLatency", () => {
  const beat = 666;
  const clicks = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => 1000 + i * beat);

  it("returns the median tap offset", () => {
    const taps = clicks.map((c, i) => c + 80 + (i % 2 ? 10 : -10));
    expect(estimateLatency(clicks, taps, beat)).toBe(80);
  });

  it("ignores a stray tap and needs at least four good taps", () => {
    const taps = [...clicks.slice(0, 5).map((c) => c + 120), 1000 + 3.5 * beat];
    expect(estimateLatency(clicks, taps, beat)).toBe(120);
    expect(estimateLatency(clicks, clicks.slice(0, 3), beat)).toBeNull();
  });

  it("clamps to a sane range", () => {
    expect(estimateLatency(clicks, clicks.map((c) => c + 320), beat)).toBe(300);
  });
});

describe("daily practice and streaks", () => {
  const day = (offset: number) => dateKey(shiftDays(new Date(2026, 9, 30, 15, 0), offset));

  it("counts each calendar minute once", () => {
    const t0 = new Date(2026, 9, 30, 15, 0, 5);
    let log = addPracticeMinute({ practiceMinutes: {}, lastActiveMinute: null }, t0);
    log = addPracticeMinute(log, new Date(2026, 9, 30, 15, 0, 50));
    expect(log.practiceMinutes["2026-10-30"]).toBe(1);
    log = addPracticeMinute(log, new Date(2026, 9, 30, 15, 1, 2));
    expect(log.practiceMinutes["2026-10-30"]).toBe(2);
    expect(log.lastActiveMinute).toBe(minuteKey(new Date(2026, 9, 30, 15, 1)));
  });

  it("keeps a streak alive until a whole day is missed", () => {
    const today = new Date(2026, 9, 30, 12);
    const minutes = { [day(1)]: 6, [day(2)]: 5, [day(3)]: 9, [day(5)]: 30 };
    expect(currentStreak(minutes, 5, today)).toBe(3); // today not met yet → counts to yesterday
    expect(currentStreak({ ...minutes, [day(0)]: 5 }, 5, today)).toBe(4);
    expect(currentStreak({ ...minutes, [day(0)]: 5 }, 10, today)).toBe(0);
    expect(currentStreak({}, 5, today)).toBe(0);
  });

  it("prunes old history and lists recent days oldest first", () => {
    const old = { "2025-01-01": 10 };
    const log = addPracticeMinute({ practiceMinutes: old, lastActiveMinute: null }, new Date(2026, 9, 30, 9, 0));
    expect(log.practiceMinutes["2025-01-01"]).toBeUndefined();
    const days = recentDays({ "2026-10-30": 4 }, new Date(2026, 9, 30, 12), 3);
    expect(days.map((d) => d.key)).toEqual(["2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(days[2].minutes).toBe(4);
  });

  it("unlocks streak achievements and respects the goal setting", () => {
    let state = { ...INITIAL_PROGRESS, dailyGoalMinutes: 5, practiceMinutes: { [day(1)]: 5, [day(2)]: 5 } };
    for (let m = 0; m < 5; m += 1) state = applyPracticeActivity(state, new Date(2026, 9, 30, 10, m)).next;
    expect(state.practiceMinutes["2026-10-30"]).toBe(5);
    expect(state.bestStreak).toBe(3);
    expect(state.achievements["streak-3"]).toBeTruthy();
    expect(applyDailyGoal(state, 15).dailyGoalMinutes).toBe(15);
    expect(applyDailyGoal(state, 7).dailyGoalMinutes).toBe(5); // not an option → default
  });
});
