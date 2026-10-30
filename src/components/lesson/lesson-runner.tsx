"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/audio/engine";
import type { LessonDefinition, LessonStep } from "@/content/lessons/types";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import type { AchievementId } from "@/lib/gamification/achievements";
import { cn } from "@/lib/cn";
import { useProgressStore } from "@/store/progress";
import { useToastStore } from "@/store/toasts";
import { AudioHint } from "@/components/ui/audio-hint";
import { LessonComplete } from "./lesson-complete";
import { ExplainStep } from "./steps/explain-step";
import { FindNotesStep } from "./steps/find-notes-step";
import { NameNotesStep } from "./steps/name-notes-step";
import { PlayNoteStep } from "./steps/play-note-step";
import { SequenceStep } from "./steps/sequence-step";
import { useAfter } from "./steps/shared";
import { TimedStep } from "./steps/timed-step";

export interface LessonResult {
  xpAwarded: number;
  alreadyCompleted: boolean;
  unlockedAchievements: AchievementId[];
}

/** Pause on a step's success state before moving on. */
const ADVANCE_MS = 700;

/**
 * Generic lesson engine: walks through a lesson's steps, saves completion (and
 * XP, once) the moment the final step is passed, then celebrates.
 */
export function LessonRunner({ lesson }: { lesson: LessonDefinition }) {
  const { t } = useI18n();
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [finished, setFinished] = useState(false);
  const navigated = useRef(false);
  const completing = useRef(false);

  useEffect(() => audioEngine.preload(), []);

  // After the learner moves between steps, focus each new step's heading as it
  // mounts so screen readers follow along (not on first page load).
  const headingRef = useCallback((el: HTMLHeadingElement | null) => {
    if (el && navigated.current) el.focus({ preventScroll: true });
  }, []);

  const isLast = index === lesson.steps.length - 1;

  const onStepComplete = () => {
    if (completing.current) return;
    completing.current = true;
    if (isLast) setResult(completeLesson(lesson.id, lesson.xp));
    // Explain steps advance immediately; exercises pause on their success state.
    if (lesson.steps[index].kind === "explain") advance();
    else setAdvancing(true);
  };

  const advance = () => {
    navigated.current = true;
    completing.current = false;
    setAdvancing(false);
    if (isLast) {
      setFinished(true);
      audioEngine.playPhrase(lesson.completesCourse ? [60, 64, 67, 72, 76, 79, 84] : [60, 64, 67, 72], {
        stagger: 0.11,
        hold: 0.9,
      });
    } else {
      setIndex((i) => i + 1);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useAfter(advancing, ADVANCE_MS, advance);

  useEffect(() => {
    if (finished && result && result.unlockedAchievements.length > 0) {
      useToastStore.getState().pushAchievements(result.unlockedAchievements);
    }
  }, [finished, result]);

  const restart = () => {
    navigated.current = true;
    completing.current = false;
    setResult(null);
    setFinished(false);
    setAdvancing(false);
    setAttempt((n) => n + 1);
    // Replays skip the opening explanation and start at the first exercise.
    setIndex(Math.max(0, lesson.steps.findIndex((s) => s.kind !== "explain")));
  };

  const total = lesson.steps.length + 1;
  const position = finished ? total : index + 1;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4">
        <p className="font-mono text-xs text-mist-400">{format(t.lesson.step, { n: position, total })}</p>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                i < position ? "bg-spectrum" : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {finished && result ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <LessonComplete lesson={lesson} result={result} headingRef={headingRef} onReplay={restart} />
          </motion.div>
        ) : (
          <motion.section
            key={`${index}-${attempt}`}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <StepView step={lesson.steps[index]} onComplete={onStepComplete} headingRef={headingRef} />
            {lesson.steps[index].kind !== "explain" && <AudioHint className="mt-4" />}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepView({
  step,
  onComplete,
  headingRef,
}: {
  step: LessonStep;
  onComplete: () => void;
  headingRef: (el: HTMLHeadingElement | null) => void;
}) {
  const { t } = useI18n();
  const props = { copy: t.steps[step.copy], onComplete, headingRef };
  switch (step.kind) {
    case "explain":
      return <ExplainStep step={step} {...props} />;
    case "play-note":
      return <PlayNoteStep step={step} {...props} />;
    case "find-notes":
      return <FindNotesStep step={step} {...props} />;
    case "name-notes":
      return <NameNotesStep step={step} {...props} />;
    case "play-sequence":
      return <SequenceStep step={step} {...props} />;
    case "play-timed":
      return <TimedStep step={step} {...props} />;
  }
}
