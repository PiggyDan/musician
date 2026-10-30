import { describe, expect, it } from "vitest";
import { getLessonState, getNextLesson, PIANO_LESSONS } from "@/content/lessons/piano";
import { evaluatePlayedNote } from "@/lib/lessons/evaluate";
import { getLevelInfo, xpForLevel } from "./levels";
import {
  applyLessonCompletion,
  applyNotesPlayed,
  HISTORY_LIMIT,
  INITIAL_PROGRESS,
  sanitizeProgress,
} from "./progress";

const NOW = new Date("2026-10-30T10:00:00.000Z");

describe("Lesson 1 — Find Middle C", () => {
  const lesson = PIANO_LESSONS[0];

  it("targets C4 and is worth exactly 10 XP", () => {
    expect(lesson.steps.find((s) => s.kind === "play-note")).toMatchObject({ target: 60 });
    expect(lesson.xp).toBe(10);
  });

  it("accepts only C4", () => {
    expect(evaluatePlayedNote(60, 60)).toBe("correct");
    expect(evaluatePlayedNote(48, 60)).toBe("wrong-octave");
    expect(evaluatePlayedNote(72, 60)).toBe("wrong-octave");
    expect(evaluatePlayedNote(61, 60)).toBe("wrong-note");
    expect(evaluatePlayedNote(59, 60)).toBe("wrong-note");
  });
});

describe("applyLessonCompletion", () => {
  it("awards XP on first completion", () => {
    const { next, xpAwarded, alreadyCompleted } = applyLessonCompletion(INITIAL_PROGRESS, "piano-1", 10, NOW);
    expect(xpAwarded).toBe(10);
    expect(alreadyCompleted).toBe(false);
    expect(next.xp).toBe(10);
    expect(next.completedLessons["piano-1"]).toEqual({ completedAt: NOW.toISOString(), xpAwarded: 10 });
    // History is newest-first: the achievements this unlocked sit above the lesson event.
    expect(next.history.filter((e) => e.type === "lesson-completed")).toEqual([
      { type: "lesson-completed", lessonId: "piano-1", xp: 10, at: NOW.toISOString() },
    ]);
  });

  it("never awards XP twice for the same lesson", () => {
    const first = applyLessonCompletion(INITIAL_PROGRESS, "piano-1", 10, NOW).next;
    const second = applyLessonCompletion(first, "piano-1", 10, NOW);
    const third = applyLessonCompletion(second.next, "piano-1", 10, NOW);
    expect(second.xpAwarded).toBe(0);
    expect(second.alreadyCompleted).toBe(true);
    expect(third.next.xp).toBe(10);
    expect(second.next).toBe(first); // unchanged reference — nothing written
  });

  it("unlocks lesson-based achievements once", () => {
    const { next, unlockedAchievements } = applyLessonCompletion(INITIAL_PROGRESS, "piano-1", 10, NOW);
    expect(unlockedAchievements.sort()).toEqual(["first-lesson", "middle-c"]);
    expect(next.achievements["middle-c"]).toBe(NOW.toISOString());
    const again = applyLessonCompletion(next, "piano-2", 15, NOW);
    expect(again.unlockedAchievements).toEqual([]);
  });

  it("does not mutate the input state", () => {
    const before = structuredClone(INITIAL_PROGRESS);
    applyLessonCompletion(INITIAL_PROGRESS, "piano-1", 10, NOW);
    expect(INITIAL_PROGRESS).toEqual(before);
  });
});

describe("applyNotesPlayed", () => {
  it("counts notes and unlocks note achievements", () => {
    const first = applyNotesPlayed(INITIAL_PROGRESS, 1, NOW);
    expect(first.unlocked).toEqual(["first-note"]);
    const hundred = applyNotesPlayed(first.next, 99, NOW);
    expect(hundred.next.notesPlayed).toBe(100);
    expect(hundred.unlocked).toEqual(["hundred-notes"]);
  });

  it("caps history length", () => {
    let state = INITIAL_PROGRESS;
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      state = applyLessonCompletion(state, `lesson-${i}`, 1, NOW).next;
    }
    expect(state.history.length).toBe(HISTORY_LIMIT);
  });
});

describe("levels", () => {
  it("starts at level 1 and follows 25·L·(L−1)", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(50);
    expect(xpForLevel(3)).toBe(150);
    expect(getLevelInfo(0)).toMatchObject({ level: 1, xpToNext: 50, progress: 0 });
    expect(getLevelInfo(10)).toMatchObject({ level: 1, xpIntoLevel: 10, progress: 0.2 });
    expect(getLevelInfo(49).level).toBe(1);
    expect(getLevelInfo(50).level).toBe(2);
    expect(getLevelInfo(149).level).toBe(2);
    expect(getLevelInfo(150).level).toBe(3);
  });

  it("is monotonic over a wide range", () => {
    let previous = 1;
    for (let xp = 0; xp <= 20000; xp += 7) {
      const { level, levelStartXp, nextLevelXp } = getLevelInfo(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      expect(xp).toBeGreaterThanOrEqual(levelStartXp);
      expect(xp).toBeLessThan(nextLevelXp);
      previous = level;
    }
  });
});

describe("lesson unlocking", () => {
  it("opens lesson 1 first and locks the rest", () => {
    expect(getLessonState(PIANO_LESSONS[0], {})).toBe("available");
    expect(getLessonState(PIANO_LESSONS[1], {})).toBe("locked");
    expect(getNextLesson({})?.id).toBe("piano-1");
  });

  it("unlocks lessons in order and finishes after lesson 5", () => {
    const done: Record<string, unknown> = { "piano-1": true };
    expect(getLessonState(PIANO_LESSONS[0], done)).toBe("completed");
    expect(getNextLesson(done)?.id).toBe("piano-2");
    for (const id of ["piano-2", "piano-3", "piano-4", "piano-5"]) done[id] = true;
    expect(getNextLesson(done)).toBeUndefined();
  });

  it("still reports coming-soon for unbuilt lessons", () => {
    const lessons = PIANO_LESSONS.map((l, i) => ({ ...l, playable: i === 0 }));
    expect(getLessonState(lessons[1], { "piano-1": true }, lessons)).toBe("coming-soon");
  });

  it("locks a playable lesson until the previous one is complete", () => {
    const lessons = PIANO_LESSONS.map((l) => ({ ...l, playable: true }));
    expect(getLessonState(lessons[1], {}, lessons)).toBe("locked");
    expect(getLessonState(lessons[1], { "piano-1": true }, lessons)).toBe("available");
  });
});

describe("sanitizeProgress", () => {
  it("recovers from corrupt storage", () => {
    expect(sanitizeProgress(null)).toEqual(INITIAL_PROGRESS);
    expect(sanitizeProgress("garbage")).toEqual(INITIAL_PROGRESS);
    expect(sanitizeProgress({ xp: "lots", history: "nope", notesPlayed: -5 })).toMatchObject({
      xp: 0,
      history: [],
      notesPlayed: 0,
    });
  });
});
