"use client";

import { Check, Eye, Headphones } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { audioEngine } from "@/audio/engine";
import { useNoteEvents } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { evaluateHeld } from "@/lib/lessons/evaluate";
import { cn } from "@/lib/cn";
import { midiToNoteName, pitchClassName, type Midi } from "@/lib/music/notes";
import { Button } from "@/components/ui/button";
import { FeedbackPanel } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { StepHeader, useFlashMarks, type StepProps } from "./shared";

const DEMO_NOTE_SEC = 0.55;

function entryNotes(entry: Midi | readonly Midi[]): Midi[] {
  return typeof entry === "number" ? [entry] : [...entry];
}

/** "E" for one note; "C3 + C4" when two hands play together. */
function entryLabel(notes: readonly Midi[]): string {
  return notes.length === 1 ? pitchClassName(notes[0]) : notes.map(midiToNoteName).join(" + ");
}

/**
 * Play a melody note by note. Entries with several notes (hands together)
 * must be held at the same time. Mistakes never reset progress.
 */
export function SequenceStep({ step, copy, onComplete, headingRef }: StepProps<"play-sequence">) {
  const { t } = useI18n();
  const s = t.lesson.sequence;
  const entries = step.notes.map(entryNotes);
  const [index, setIndex] = useState(0);
  const [peek, setPeek] = useState(false);
  const [feedback, setFeedback] = useState<{ id: number; ok: boolean; midi: Midi } | null>(null);
  const [marks, flash] = useFlashMarks();
  const cancelDemo = useRef<(() => void) | null>(null);
  const done = index >= entries.length;
  const hasChords = entries.some((e) => e.length > 1);

  useEffect(() => () => cancelDemo.current?.(), []);

  useNoteEvents((event) => {
    if (event.type !== "on" || event.source === "demo" || done) return;
    const required = entries[index];
    if (!required.includes(event.midi)) {
      setFeedback((prev) => ({ id: (prev?.id ?? 0) + 1, ok: false, midi: event.midi }));
      flash(event.midi, "wrong");
      return;
    }
    // A single note completes at once; a hands-together entry when all its keys are down.
    if (evaluateHeld(audioEngine.getActiveNotes(), required).missing.length > 0) return;
    const next = index + 1;
    setFeedback((prev) => ({ id: (prev?.id ?? 0) + 1, ok: true, midi: event.midi }));
    flash(event.midi, "correct", next === entries.length);
    setIndex(next);
    setPeek(false);
    if (next === entries.length) onComplete();
  });

  const listen = () => {
    void audioEngine.unlock();
    cancelDemo.current?.();
    cancelDemo.current = audioEngine.playTimed(
      entries.flatMap((notes, i) => notes.map((midi) => ({ midi, at: 0.1 + i * DEMO_NOTE_SEC, duration: DEMO_NOTE_SEC * 0.9 }))),
    );
  };

  const expected = entries[Math.min(index, entries.length - 1)];
  const showNext = !done && (step.guide || peek);
  const progress = format(s.progress, { n: Math.min(index + 1, entries.length), total: entries.length });
  const message = done
    ? s.done
    : !feedback
      ? hasChords
        ? `${progress} · ${s.together}`
        : progress
      : feedback.ok
        ? `${s.correct} ${progress}`
        : step.guide
          ? format(s.wrongGuided, { note: midiToNoteName(feedback.midi), expected: entryLabel(expected) })
          : format(s.wrongMemory, { note: midiToNoteName(feedback.midi), n: index + 1 });

  return (
    <div>
      <StepHeader
        copy={copy}
        headingRef={headingRef}
        aside={
          <>
            <Button variant="secondary" size="sm" onClick={listen}>
              <Headphones className="size-4" aria-hidden />
              {s.listen}
            </Button>
            {!step.guide && (
              <Button variant="ghost" size="sm" onClick={() => setPeek(true)} disabled={peek || done}>
                <Eye className="size-4" aria-hidden />
                {s.peek}
              </Button>
            )}
          </>
        }
      />

      {/* The melody as letters (and finger numbers): done ✓, current highlighted. */}
      <ol className="mt-6 flex flex-wrap gap-1.5 sm:gap-2" aria-label={progress}>
        {entries.map((notes, i) => (
          <li key={i} aria-current={i === index ? "step" : undefined} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "relative flex h-11 min-w-9 items-center justify-center rounded-xl px-2 font-mono text-sm font-semibold ring-1 transition-all duration-300 sm:h-12 sm:min-w-11 sm:text-base",
                notes.length > 1 && "text-xs sm:text-xs",
                i < index && "bg-success/15 text-success ring-success/40",
                i === index && "bg-pulse/20 text-mist-50 ring-2 ring-pulse shadow-[0_0_24px_-4px_rgba(139,123,255,0.9)] -translate-y-0.5",
                i > index && "bg-white/[0.03] text-mist-400 ring-white/10",
              )}
            >
              {i < index ? <Check className="size-4" strokeWidth={3} aria-label={entryLabel(notes)} /> : entryLabel(notes)}
            </span>
            {step.fingers?.[i] !== undefined && (
              <span className="font-mono text-[11px] text-mist-500" title={s.finger}>
                {step.fingers[i]}
              </span>
            )}
          </li>
        ))}
      </ol>
      {step.fingers && <p className="mt-2 text-xs text-mist-500">{s.fingerHint}</p>}

      <FeedbackPanel
        className="mt-5"
        tone={done ? "correct" : !feedback ? "idle" : feedback.ok ? "correct" : "wrong"}
        message={message}
        messageKey={done ? "done" : (feedback?.id ?? "idle")}
        badge={feedback && !feedback.ok ? midiToNoteName(feedback.midi) : undefined}
      />

      <div className="mt-8">
        <LessonKeyboard range={step.keyboard} highlight={showNext ? expected : []} marks={marks} showNoteNames keyHints />
      </div>
    </div>
  );
}
