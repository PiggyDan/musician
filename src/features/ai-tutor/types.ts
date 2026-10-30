/**
 * AI Music Teacher — architecture contract only. NOTHING HERE IS IMPLEMENTED.
 *
 * The UI shows the tutor as "in development". When it is built, the provider
 * will run server-side (a Route Handler or Server Action) so API keys never
 * reach the browser; the client will only talk to our own endpoint.
 *
 * Planned flow:
 *   lesson/studio → PerformanceSnapshot → POST /api/tutor → TutorProvider (server)
 *   → TutorResponse (explanation, mistakes, recommendations) → UI
 */
import type { InstrumentId } from "@/content/instruments";
import type { Locale } from "@/i18n/types";
import type { Midi } from "@/lib/music/notes";

/** A timestamped note the learner played, captured from the audio engine's note events. */
export interface PlayedNote {
  midi: Midi;
  velocity: number;
  /** Milliseconds since the attempt started. */
  startMs: number;
  durationMs: number;
}

/** What the tutor sees about one attempt at an exercise. */
export interface PerformanceSnapshot {
  instrument: InstrumentId;
  lessonId: string;
  expected: readonly Midi[];
  played: readonly PlayedNote[];
  attempts: number;
}

export type TutorRequest =
  | { kind: "explain"; topic: string; locale: Locale }
  | { kind: "question"; question: string; lessonId?: string; locale: Locale }
  | { kind: "analyze"; performance: PerformanceSnapshot; locale: Locale };

export interface TutorMistake {
  noteIndex: number;
  kind: "wrong-pitch" | "wrong-octave" | "timing" | "missed";
  explanation: string;
}

export interface TutorResponse {
  message: string;
  mistakes?: TutorMistake[];
  /** Lesson ids the learner should try next. */
  recommendedLessons?: string[];
  /** Suggested change in difficulty: -1 easier, 0 same, 1 harder. */
  difficultyShift?: -1 | 0 | 1;
}

/** Server-side adapter for an LLM provider. Implementations must never run in the browser. */
export interface TutorProvider {
  respond(request: TutorRequest, signal?: AbortSignal): Promise<TutorResponse>;
}
