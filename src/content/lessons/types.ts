import type { InstrumentId } from "@/content/instruments";
import type { Midi } from "@/lib/music/notes";

/** What the learner must do to pass a lesson. Extend this union for new lesson kinds. */
export type LessonTask = { kind: "play-note"; target: Midi };

export interface LessonDefinition {
  /** Globally unique and stable — used as the progress storage key. */
  id: string;
  /** URL segment under /learn/<instrument>/lesson/. */
  slug: string;
  instrument: InstrumentId;
  order: number;
  xp: number;
  estimatedMinutes: number;
  /** Key into `dictionary.lessons`. */
  i18nKey: "l1" | "l2" | "l3" | "l4" | "l5";
  /** Coming-soon lessons are listed but not playable yet. */
  playable: boolean;
  task?: LessonTask;
}

export type LessonState = "completed" | "available" | "locked" | "coming-soon";
