"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { audioEngine } from "@/audio/engine";
import { useActiveNotes, useNoteEvents } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { chordRole, evaluateHeld, type ChordRole } from "@/lib/lessons/evaluate";
import { cn } from "@/lib/cn";
import { midiToNoteName, pitchClassName, type Midi } from "@/lib/music/notes";
import { Button } from "@/components/ui/button";
import { StaffView } from "@/components/music/staff-view";
import { FeedbackPanel, StepDots } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { StepHeader, useAfter, type StepProps } from "./shared";

const NEXT_MS = 1000;
const ROLE_ORDER: Record<ChordRole, number> = { root: 0, third: 1, fifth: 2, other: 3 };

type Feedback =
  | { id: number; kind: "complete" }
  | { id: number; kind: "partial"; missing: Midi }
  | { id: number; kind: "wrong"; midi: Midi };

/**
 * Hold each chord with every note down together. Feedback talks in chord tones
 * (root, third, fifth) so the learner understands how the chord is built.
 */
export function ChordsStep({ step, copy, onComplete, headingRef }: StepProps<"play-chords">) {
  const { t } = useI18n();
  const c = t.lesson.chords;
  const [index, setIndex] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [misses, setMisses] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const held = useActiveNotes();
  const chord = step.chords[Math.min(index, step.chords.length - 1)];
  const tones = [...chord.notes].sort((a, b) => ROLE_ORDER[chordRole(a, chord.root)] - ROLE_ORDER[chordRole(b, chord.root)]);

  useAfter(advancing, NEXT_MS, () => {
    setAdvancing(false);
    setShowHint(false);
    setMisses(0);
    setFeedback(null);
    const next = index + 1;
    setIndex(next);
    if (next >= step.chords.length) onComplete();
  });

  useNoteEvents((event) => {
    if (event.type !== "on" || event.source === "demo" || advancing || index >= step.chords.length) return;
    const result = evaluateHeld(audioEngine.getActiveNotes(), chord.notes);
    if (result.status === "complete") {
      setFeedback((f) => ({ id: (f?.id ?? 0) + 1, kind: "complete" }));
      setAdvancing(true);
    } else if (result.status === "wrong") {
      setFeedback((f) => ({ id: (f?.id ?? 0) + 1, kind: "wrong", midi: result.wrong[0] }));
      setMisses((n) => n + 1);
    } else {
      // Ask for the next missing tone in chord-building order: root, third, fifth.
      const next = [...result.missing].sort((a, b) => ROLE_ORDER[chordRole(a, chord.root)] - ROLE_ORDER[chordRole(b, chord.root)])[0];
      setFeedback((f) => ({ id: (f?.id ?? 0) + 1, kind: "partial", missing: next }));
    }
  });

  const roleName = (m: Midi) => c.roles[chordRole(m, chord.root)];
  const toneList = tones.map((m) => pitchClassName(m)).join(" – ");
  const message = !feedback
    ? format(c.prompt, { chord: chord.name })
    : feedback.kind === "complete"
      ? format(c.complete, { chord: chord.name, tones: tones.map((m) => `${roleName(m)} ${pitchClassName(m)}`).join(", ") })
      : feedback.kind === "partial"
        ? format(c.partial, { role: roleName(feedback.missing), letter: pitchClassName(feedback.missing) })
        : format(c.wrong, { note: midiToNoteName(feedback.midi), chord: chord.name, tones: toneList });

  const hintKeys = showHint || misses >= 2 ? [...chord.notes] : [];

  return (
    <div>
      <StepHeader
        copy={copy}
        headingRef={headingRef}
        aside={
          <Button variant={misses >= 2 && !showHint ? "primary" : "secondary"} size="sm" onClick={() => setShowHint(true)} disabled={showHint}>
            <Lightbulb className="size-4" aria-hidden />
            {t.lesson.feedback.hint}
          </Button>
        }
      />

      <div className="mt-6 grid items-center gap-5 sm:grid-cols-[minmax(0,20rem)_1fr]">
        <StaffView
          kind={step.clef}
          groups={[{ keys: chord.notes, label: chord.name, color: advancing ? "#1f9e6e" : undefined }]}
          label={format(c.staffLabel, { chord: chord.name, tones: toneList })}
        />
        <div>
          <p className="font-display text-4xl font-medium">
            {chord.name}
            <span className="ml-2 text-base text-mist-400">{c.major}</span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tones.map((m) => {
              const isHeld = held.includes(m);
              return (
                <li
                  key={m}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm ring-1 transition-colors",
                    isHeld || advancing ? "bg-success/15 text-success ring-success/40" : "bg-white/[0.04] text-mist-200 ring-white/10",
                  )}
                >
                  <span className="text-xs text-mist-400">{roleName(m)}</span> <span className="font-mono font-semibold">{pitchClassName(m)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <StepDots total={step.chords.length} done={index + (advancing ? 1 : 0)} label={format(c.progress, { n: index, total: step.chords.length })} />
          </div>
        </div>
      </div>

      <FeedbackPanel
        className="mt-5"
        tone={!feedback ? "idle" : feedback.kind === "complete" ? "correct" : feedback.kind === "wrong" ? "wrong" : "idle"}
        message={message}
        messageKey={feedback?.id ?? `q-${index}`}
        badge={feedback?.kind === "wrong" ? midiToNoteName(feedback.midi) : feedback?.kind === "partial" ? pitchClassName(feedback.missing) : undefined}
      />
      <div className="mt-8">
        <LessonKeyboard range={step.keyboard} highlight={advancing ? [] : hintKeys} showNoteNames keyHints />
      </div>
      <p className="mt-3 text-center text-xs text-mist-500">{c.inputHint}</p>
    </div>
  );
}
