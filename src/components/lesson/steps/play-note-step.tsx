"use client";

import { Lightbulb } from "lucide-react";
import { useRef, useState } from "react";
import { useNoteEvents } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { evaluatePlayedNote, type NoteVerdict } from "@/lib/lessons/evaluate";
import { midiToNoteName, type Midi } from "@/lib/music/notes";
import { Button } from "@/components/ui/button";
import { FeedbackPanel } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { StepHeader, useFlashMarks, type StepProps } from "./shared";

/** Play one exact pitch. Wrong octave and wrong note get different hints. */
export function PlayNoteStep({ step, copy, onComplete, headingRef }: StepProps<"play-note">) {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState<{ id: number; verdict: NoteVerdict; midi: Midi } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [marks, flash] = useFlashMarks();
  const solved = useRef(false);
  const target = midiToNoteName(step.target);

  useNoteEvents((event) => {
    if (event.type !== "on" || event.source === "demo" || solved.current) return;
    const verdict = evaluatePlayedNote(event.midi, step.target);
    setFeedback((f) => ({ id: (f?.id ?? 0) + 1, verdict, midi: event.midi }));
    flash(event.midi, verdict === "correct" ? "correct" : "wrong", verdict === "correct");
    if (verdict === "correct") {
      solved.current = true;
      onComplete();
    } else {
      setAttempts((n) => n + 1);
    }
  });

  const note = feedback ? midiToNoteName(feedback.midi) : "";
  const fb = t.lesson.feedback;
  const message = !feedback
    ? fb.listening
    : feedback.verdict === "correct"
      ? (copy.success ?? fb.correct)
      : feedback.verdict === "wrong-octave"
        ? format(copy.wrongOctave ?? fb.wrongOctave, { note, target })
        : format(copy.wrongNote ?? fb.wrongNote, { note, target });

  return (
    <div>
      <StepHeader
        copy={copy}
        headingRef={headingRef}
        aside={
          <>
            {attempts > 0 && <span className="font-mono text-xs text-mist-500">{format(fb.attempts, { n: attempts })}</span>}
            <Button
              variant={attempts >= 2 && !showHint ? "primary" : "secondary"}
              size="sm"
              onClick={() => setShowHint(true)}
              disabled={showHint}
            >
              <Lightbulb className="size-4" aria-hidden />
              {fb.hint}
            </Button>
          </>
        }
      />
      <FeedbackPanel
        className="mt-6"
        tone={!feedback ? "idle" : feedback.verdict === "correct" ? "correct" : "wrong"}
        message={message}
        messageKey={feedback?.id ?? "idle"}
        badge={feedback && feedback.verdict !== "correct" ? note : undefined}
        detail={showHint && feedback?.verdict !== "correct" ? <p className="mt-1 text-xs text-pulse">{fb.hintActive}</p> : null}
      />
      <div className="mt-8">
        <LessonKeyboard range={step.keyboard} highlight={showHint ? [step.target] : []} marks={marks} />
      </div>
    </div>
  );
}
