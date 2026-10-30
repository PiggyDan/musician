import type { Midi } from "@/lib/music/notes";

export interface ExpectedHit {
  timeMs: number;
  /** Ignored when scoring rhythm only. */
  midi: Midi;
}

export interface PlayedHit {
  timeMs: number;
  midi: Midi;
}

export type HitStatus = "perfect" | "good" | "early" | "late" | "wrong-pitch" | "missed";

export interface TimingTolerances {
  /** |offset| ≤ perfectMs → "perfect". */
  perfectMs: number;
  /** |offset| ≤ goodMs → "good". Both count as on time. */
  goodMs: number;
  /** Plays further than this from any expected note are extra taps. */
  windowMs: number;
}

/**
 * Generous beginner tolerances. A note within ±200 ms of the beat counts as on
 * time — roughly a sixteenth note at 75 BPM — and anything within ±350 ms still
 * gets "a little early/late" feedback instead of being ignored.
 */
export const BEGINNER_TOLERANCES: TimingTolerances = { perfectMs: 80, goodMs: 200, windowMs: 350 };

export interface NoteResult {
  status: HitStatus;
  /** Played time minus expected time, when something was played near it. */
  offsetMs: number | null;
}

export interface TimingScore {
  notes: NoteResult[];
  /** For each play, the expected note it was matched to, or null if extra. */
  matches: (number | null)[];
  /** Notes played on time (and on pitch, when checked). */
  hits: number;
  extras: number;
  accuracy: number;
}

const ON_TIME: ReadonlySet<HitStatus> = new Set(["perfect", "good"]);

export function isOnTime(status: HitStatus): boolean {
  return ON_TIME.has(status);
}

function statusForOffset(offset: number, tol: TimingTolerances): HitStatus {
  const abs = Math.abs(offset);
  if (abs <= tol.perfectMs) return "perfect";
  if (abs <= tol.goodMs) return "good";
  return offset < 0 ? "early" : "late";
}

/** Better results replace worse ones when a learner corrects themselves. */
const RANK: Record<HitStatus, number> = {
  missed: 0,
  "wrong-pitch": 1,
  early: 2,
  late: 2,
  good: 3,
  perfect: 4,
};

/**
 * Scores a performance against expected note onsets. Each play is matched to
 * the nearest expected note within the window; with `matchPitch`, a same-pitch
 * note is preferred and a wrong pitch is recorded (but can still be corrected
 * by a later, right note inside the window).
 */
export function scoreTimedPerformance(
  expected: readonly ExpectedHit[],
  played: readonly PlayedHit[],
  { matchPitch, tolerances = BEGINNER_TOLERANCES }: { matchPitch: boolean; tolerances?: TimingTolerances },
): TimingScore {
  const notes: NoteResult[] = expected.map(() => ({ status: "missed", offsetMs: null }));
  const settled = expected.map(() => false); // already credited with a correct-pitch play
  let extras = 0;

  const sorted = played.map((p, i) => ({ ...p, i })).sort((a, b) => a.timeMs - b.timeMs);
  const matchOrder: (number | null)[] = new Array(played.length).fill(null);

  for (const play of sorted) {
    let best: number | null = null;
    let bestScore = Infinity;
    expected.forEach((note, index) => {
      if (settled[index]) return;
      const offset = play.timeMs - note.timeMs;
      if (Math.abs(offset) > tolerances.windowMs) return;
      const pitchOk = !matchPitch || note.midi === play.midi;
      // Prefer right-pitch candidates, then the closest in time.
      const score = Math.abs(offset) + (pitchOk ? 0 : 10_000);
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });

    if (best === null) {
      extras += 1;
      continue;
    }

    const offset = play.timeMs - expected[best].timeMs;
    const pitchOk = !matchPitch || expected[best].midi === play.midi;
    const status: HitStatus = pitchOk ? statusForOffset(offset, tolerances) : "wrong-pitch";
    if (RANK[status] > RANK[notes[best].status]) notes[best] = { status, offsetMs: offset };
    if (pitchOk) settled[best] = true;
    matchOrder[play.i] = best;
  }

  const hits = notes.filter((n) => isOnTime(n.status)).length;
  return { notes, matches: matchOrder, hits, extras, accuracy: expected.length ? hits / expected.length : 0 };
}

/** Passing needs enough on-time notes and not too many stray taps. */
export function hasPassed(score: TimingScore, passRatio: number, maxExtras = 3): boolean {
  return score.hits >= Math.ceil(score.notes.length * passRatio) && score.extras <= maxExtras;
}

export type TimingTendency = "early" | "late" | "pitch" | "missed" | null;

/** The learner's most common problem, for a targeted tip after a failed attempt. */
export function dominantProblem(score: TimingScore): TimingTendency {
  const counts = { early: 0, late: 0, pitch: 0, missed: 0 };
  for (const note of score.notes) {
    if (note.status === "early") counts.early += 1;
    else if (note.status === "late") counts.late += 1;
    else if (note.status === "wrong-pitch") counts.pitch += 1;
    else if (note.status === "missed") counts.missed += 1;
  }
  const [kind, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? (kind as TimingTendency) : null;
}

export function beatToMs(beat: number, bpm: number): number {
  return (beat * 60_000) / bpm;
}
