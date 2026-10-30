"use client";

import { useState } from "react";
import { audioEngine } from "@/audio/engine";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { NOTE_LETTERS, noteLetterOf, type NoteLetter } from "@/lib/music/notes";
import { FeedbackPanel, StepDots } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { StepHeader, useAfter, type StepProps } from "./shared";

const NEXT_MS = 800;

/** A key glows; the learner picks its letter. Wrong guesses can be retried. */
export function NameNotesStep({ step, copy, onComplete, headingRef }: StepProps<"name-notes">) {
  const { t } = useI18n();
  const n = t.lesson.name;
  const [index, setIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [wrongGuesses, setWrongGuesses] = useState<NoteLetter[]>([]);
  const [feedback, setFeedback] = useState<{ id: number; ok: boolean; guess: NoteLetter } | null>(null);

  const key = step.keys[Math.min(index, step.keys.length - 1)];
  const answer = noteLetterOf(key);

  useAfter(advancing, NEXT_MS, () => {
    setAdvancing(false);
    setWrongGuesses([]);
    setFeedback(null);
    const next = index + 1;
    setIndex(next);
    if (next >= step.keys.length) onComplete();
  });

  const choose = (guess: NoteLetter) => {
    if (advancing || index >= step.keys.length) return;
    const ok = guess === answer;
    setFeedback((prev) => ({ id: (prev?.id ?? 0) + 1, ok, guess }));
    if (ok) {
      void audioEngine.unlock();
      audioEngine.playTimed([{ midi: key, at: 0, duration: 0.5 }]);
      setAdvancing(true);
    } else {
      setWrongGuesses((list) => [...list, guess]);
    }
  };

  const message = !feedback
    ? n.question
    : feedback.ok
      ? format(n.correct, { letter: feedback.guess })
      : format(n.wrong, { guess: feedback.guess });

  return (
    <div>
      <StepHeader copy={copy} headingRef={headingRef} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <StepDots
          total={step.keys.length}
          done={index + (advancing ? 1 : 0)}
          label={format(n.progress, { n: index, total: step.keys.length })}
        />
        <p className="font-mono text-xs text-mist-500">
          {format(n.progress, { n: Math.min(index + 1, step.keys.length), total: step.keys.length })}
        </p>
      </div>

      <FeedbackPanel
        className="mt-4"
        tone={!feedback ? "idle" : feedback.ok ? "correct" : "wrong"}
        message={message}
        messageKey={feedback?.id ?? `q-${index}`}
        badge={feedback && !feedback.ok ? feedback.guess : "?"}
      />

      <div className="mt-8">
        <LessonKeyboard
          range={step.keyboard}
          highlight={advancing ? [] : [key]}
          marks={advancing ? { [key]: "correct" } : {}}
        />
      </div>

      <div role="group" aria-label={n.choices} className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3">
        {NOTE_LETTERS.map((letter) => {
          const wrong = wrongGuesses.includes(letter);
          const right = advancing && letter === answer;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => choose(letter)}
              disabled={wrong || advancing}
              className={cn(
                "font-display h-14 rounded-2xl text-xl font-medium ring-1 transition-all duration-200 active:scale-95 sm:h-16 sm:text-2xl",
                right && "bg-success text-ink-950 ring-success shadow-[0_0_30px_-4px_rgba(79,224,168,0.8)]",
                wrong && "bg-warn/10 text-warn/60 ring-warn/30",
                !right && !wrong && "bg-white/[0.04] text-mist-50 ring-white/10 hover:bg-white/[0.09] hover:ring-pulse/50",
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
