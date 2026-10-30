"use client";

import { AnimatePresence, motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import { useMemo, useState } from "react";
import { useNoteEvents } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { matchesLetter } from "@/lib/lessons/evaluate";
import { midiToNoteName, noteLetterOf, type Midi } from "@/lib/music/notes";
import { Button } from "@/components/ui/button";
import { FeedbackPanel, StepDots } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { StepHeader, useAfter, useFlashMarks, type StepProps } from "./shared";

const NEXT_MS = 700;

/** Play each requested letter in turn, in any octave. */
export function FindNotesStep({ step, copy, onComplete, headingRef }: StepProps<"find-notes">) {
  const { t } = useI18n();
  const f = t.lesson.find;
  const [index, setIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [misses, setMisses] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{ id: number; ok: boolean; midi: Midi } | null>(null);
  const [marks, flash] = useFlashMarks();
  const letter = step.letters[Math.min(index, step.letters.length - 1)];
  const done = index >= step.letters.length;

  // Every key with this letter across the piano; the keyboard renders the visible ones.
  const hintKeys = useMemo(
    () => (showHint ? Array.from({ length: 88 }, (_, i) => i + 21).filter((m) => noteLetterOf(m) === letter) : []),
    [showHint, letter],
  );

  useAfter(advancing, NEXT_MS, () => {
    setAdvancing(false);
    setShowHint(false);
    setMisses(0);
    const next = index + 1;
    setIndex(next);
    if (next >= step.letters.length) onComplete();
  });

  useNoteEvents((event) => {
    if (event.type !== "on" || event.source === "demo" || advancing || done) return;
    const ok = matchesLetter(event.midi, letter);
    setFeedback((prev) => ({ id: (prev?.id ?? 0) + 1, ok, midi: event.midi }));
    flash(event.midi, ok ? "correct" : "wrong");
    if (ok) setAdvancing(true);
    else setMisses((n) => n + 1);
  });

  const message = !feedback
    ? format(f.prompt, { letter })
    : feedback.ok
      ? format(f.correct, { letter: noteLetterOf(feedback.midi) ?? letter })
      : format(f.wrong, { note: midiToNoteName(feedback.midi), tip: f.tips[letter] });

  return (
    <div>
      <StepHeader
        copy={copy}
        headingRef={headingRef}
        aside={
          <Button
            variant={misses >= 2 && !showHint ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowHint(true)}
            disabled={showHint || done}
          >
            <Lightbulb className="size-4" aria-hidden />
            {t.lesson.feedback.hint}
          </Button>
        }
      />

      <div className="mt-6 flex items-center gap-5">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-ink-850 ring-1 ring-white/10 shadow-[0_0_40px_-10px_rgba(106,85,255,0.7)]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={letter}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="font-display text-spectrum text-4xl font-medium"
              aria-hidden
            >
              {letter}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-xs text-mist-500">
            {format(f.progress, { n: Math.min(index + 1, step.letters.length), total: step.letters.length })}
          </p>
          <StepDots
            total={step.letters.length}
            done={index + (advancing ? 1 : 0)}
            failedIndex={feedback && !feedback.ok ? index : null}
            label={format(f.progress, { n: index, total: step.letters.length })}
          />
        </div>
      </div>

      <FeedbackPanel
        className="mt-5"
        tone={!feedback ? "idle" : feedback.ok ? "correct" : "wrong"}
        message={message}
        messageKey={feedback?.id ?? `idle-${letter}`}
        badge={feedback && !feedback.ok ? midiToNoteName(feedback.midi) : undefined}
        detail={showHint ? <p className="mt-1 text-xs text-pulse">{t.lesson.feedback.hintActive}</p> : null}
      />
      <div className="mt-8">
        <LessonKeyboard range={step.keyboard} highlight={hintKeys} marks={marks} />
      </div>
    </div>
  );
}
