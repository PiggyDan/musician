"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { useNoteEvents } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import type { Dictionary } from "@/i18n/types";
import { evaluatePlayedNote } from "@/lib/lessons/evaluate";
import { midiToNoteName, pitchClassName, type Midi } from "@/lib/music/notes";
import { staffPosition, type StaffClef } from "@/lib/music/staff";
import { Button } from "@/components/ui/button";
import { StaffView } from "@/components/music/staff-view";
import { FeedbackPanel, StepDots } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { StepHeader, useAfter, useFlashMarks, type StepProps } from "./shared";

const NEXT_MS = 800;

/** "on line 2", "in space 3", "on a ledger line below the staff"… */
export function describePosition(midi: Midi, clef: StaffClef, t: Dictionary): string {
  const p = staffPosition(midi, clef);
  const r = t.lesson.read.position;
  switch (p.kind) {
    case "line":
      return format(r.line, { n: p.number });
    case "space":
      return format(r.space, { n: p.number });
    case "ledger-below":
      return p.count === 1 ? r.ledgerBelow : format(r.ledgersBelow, { n: p.count });
    case "ledger-above":
      return p.count === 1 ? r.ledgerAbove : format(r.ledgersAbove, { n: p.count });
    case "below":
      return r.below;
    case "above":
      return r.above;
  }
}

/**
 * Note reading: one note on the staff, the learner plays that exact pitch.
 * Hints escalate — where it sits, then its letter, then the key — so the
 * learner practises reading, not following lights.
 */
export function ReadNotesStep({ step, copy, onComplete, headingRef }: StepProps<"read-notes">) {
  const { t } = useI18n();
  const r = t.lesson.read;
  const [index, setIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [feedback, setFeedback] = useState<{ id: number; ok: boolean; octave: boolean; midi: Midi } | null>(null);
  const [marks, flash] = useFlashMarks();
  const target = step.notes[Math.min(index, step.notes.length - 1)];
  const position = describePosition(target, step.clef, t);
  const showPosition = misses >= 1;
  const showLetter = misses >= 2;
  const showKey = misses >= 3;

  useAfter(advancing, NEXT_MS, () => {
    setAdvancing(false);
    setMisses(0);
    setFeedback(null);
    const next = index + 1;
    setIndex(next);
    if (next >= step.notes.length) onComplete();
  });

  useNoteEvents((event) => {
    if (event.type !== "on" || event.source === "demo" || advancing || index >= step.notes.length) return;
    const verdict = evaluatePlayedNote(event.midi, target);
    const ok = verdict === "correct";
    setFeedback((f) => ({ id: (f?.id ?? 0) + 1, ok, octave: verdict === "wrong-octave", midi: event.midi }));
    flash(event.midi, ok ? "correct" : "wrong");
    if (ok) setAdvancing(true);
    else setMisses((n) => n + 1);
  });

  const note = feedback ? midiToNoteName(feedback.midi) : "";
  const message = !feedback
    ? r.prompt
    : feedback.ok
      ? format(r.correct, { note: midiToNoteName(target), position })
      : feedback.octave
        ? format(r.wrongOctave, { note })
        : format(r.wrong, { note });

  const hint = showLetter
    ? format(r.hintLetter, { position, letter: pitchClassName(target) })
    : showPosition
      ? format(r.hintPosition, { position, landmark: step.clef === "treble" ? r.landmarkTreble : r.landmarkBass })
      : null;

  return (
    <div>
      <StepHeader
        copy={copy}
        headingRef={headingRef}
        aside={
          <Button variant={misses >= 2 && !showKey ? "primary" : "secondary"} size="sm" onClick={() => setMisses(3)} disabled={showKey}>
            <Lightbulb className="size-4" aria-hidden />
            {t.lesson.feedback.hint}
          </Button>
        }
      />

      <div className="mt-6 grid items-center gap-5 sm:grid-cols-[minmax(0,22rem)_1fr]">
        <StaffView
          kind={step.clef}
          groups={[{ keys: [target], color: advancing ? "#1f9e6e" : undefined }]}
          label={format(r.staffLabel, { position, clef: step.clef === "treble" ? r.treble : r.bass })}
        />
        <div className="space-y-3">
          <StepDots total={step.notes.length} done={index + (advancing ? 1 : 0)} label={format(r.progress, { n: index, total: step.notes.length })} />
          <p className="font-mono text-xs text-mist-500">
            {format(r.progress, { n: Math.min(index + 1, step.notes.length), total: step.notes.length })}
          </p>
        </div>
      </div>

      <FeedbackPanel
        className="mt-5"
        tone={!feedback ? "idle" : feedback.ok ? "correct" : "wrong"}
        message={message}
        messageKey={feedback?.id ?? `q-${index}`}
        badge={feedback && !feedback.ok ? note : undefined}
        detail={hint && !feedback?.ok ? <p className="mt-1 text-xs text-pulse">{hint}</p> : null}
      />
      <div className="mt-8">
        <LessonKeyboard range={step.keyboard} highlight={showKey && !advancing ? [target] : []} marks={marks} />
      </div>
    </div>
  );
}
