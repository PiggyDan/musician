"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Ear, Lightbulb, Music2, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/audio/engine";
import { useAudioStatus, useNoteEvents } from "@/audio/hooks";
import type { LessonDefinition } from "@/content/lessons/types";
import { useElementWidth } from "@/hooks/use-element-width";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import type { AchievementId } from "@/lib/gamification/achievements";
import { getLevelInfo } from "@/lib/gamification/levels";
import { evaluatePlayedNote, type NoteVerdict } from "@/lib/lessons/evaluate";
import { MIDDLE_C, midiToNoteName, offsetWhiteKeys, type Midi } from "@/lib/music/notes";
import { cn } from "@/lib/cn";
import { useProgressStore } from "@/store/progress";
import { useToastStore } from "@/store/toasts";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { PianoKeyboard, type KeyMark } from "@/components/piano/piano-keyboard";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";
import { KeyPatternDiagram } from "./key-pattern-diagram";

type Phase = "intro" | "task" | "complete";

interface Feedback {
  id: number;
  verdict: NoteVerdict;
  midi: Midi;
}

interface Result {
  xpAwarded: number;
  alreadyCompleted: boolean;
  unlockedAchievements: AchievementId[];
}

const MIN_WHITE_KEY_PX = 36;
const SUCCESS_DELAY_MS = 900;
const MARK_MS = 650;
const PHASES: Phase[] = ["intro", "task", "complete"];

export function PlayNoteLesson({ lesson, target }: { lesson: LessonDefinition; target: Midi }) {
  const { t } = useI18n();
  const completeLesson = useProgressStore((s) => s.completeLesson);
  const totalXp = useProgressStore((s) => s.xp);
  const audioStatus = useAudioStatus();

  const [phase, setPhase] = useState<Phase>("intro");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [marks, setMarks] = useState<Partial<Record<Midi, KeyMark>>>({});
  const [result, setResult] = useState<Result | null>(null);

  const solvedRef = useRef(false);
  const feedbackId = useRef(0);
  const timers = useRef<number[]>([]);
  const navigatedRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef, 720);
  const whiteKeyCount = Math.min(15, Math.max(8, Math.floor(width / MIN_WHITE_KEY_PX)));
  // C4 stays near — but not exactly at — the center, so the learner has to look.
  const startMidi = whiteKeyCount >= 15 ? 48 : offsetWhiteKeys(MIDDLE_C, -Math.floor(whiteKeyCount / 2));

  useComputerKeyboard({ baseMidi: MIDDLE_C, enabled: phase === "task" });

  useEffect(() => {
    audioEngine.preload();
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  // Once the learner moves between steps, focus each new step's heading as it
  // mounts so screen readers follow along (but not on the initial page load).
  const headingRef = useCallback((el: HTMLHeadingElement | null) => {
    if (el && navigatedRef.current) el.focus();
  }, []);

  const goTo = (next: Phase) => {
    navigatedRef.current = true;
    setPhase(next);
  };

  // Progress is saved the moment the note is right; the celebration follows a
  // beat later. Effect-driven so it survives the route being hidden and shown.
  useEffect(() => {
    if (!result || phase !== "task") return;
    const id = window.setTimeout(() => {
      navigatedRef.current = true;
      setPhase("complete");
      audioEngine.playPhrase([60, 64, 67, 72], { stagger: 0.11, hold: 0.9 });
      if (result.unlockedAchievements.length > 0) {
        useToastStore.getState().pushAchievements(result.unlockedAchievements);
      }
    }, SUCCESS_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [result, phase]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useNoteEvents((event) => {
    if (phase !== "task" || event.type !== "on" || event.source === "demo" || solvedRef.current) return;
    const verdict = evaluatePlayedNote(event.midi, target);
    feedbackId.current += 1;
    setFeedback({ id: feedbackId.current, verdict, midi: event.midi });
    setMarks({ [event.midi]: verdict === "correct" ? "correct" : "wrong" });

    if (verdict === "correct") {
      solvedRef.current = true;
      setResult(completeLesson(lesson.id, lesson.xp));
    } else {
      setAttempts((n) => n + 1);
      const id = feedbackId.current;
      later(() => {
        if (feedbackId.current === id) setMarks({});
      }, MARK_MS);
    }
  });

  const restart = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    solvedRef.current = false;
    setFeedback(null);
    setAttempts(0);
    setShowHint(false);
    setMarks({});
    setResult(null);
    goTo("task");
  };

  const stepIndex = PHASES.indexOf(phase);
  const levelInfo = getLevelInfo(totalXp);

  return (
    <div className="mt-6">
      {/* Step progress */}
      <div className="flex items-center gap-4">
        <p className="font-mono text-xs text-mist-400">
          {format(t.lesson.step, { n: stepIndex + 1, total: PHASES.length })}
        </p>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {PHASES.map((p, i) => (
            <span
              key={p}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                i <= stepIndex ? "bg-spectrum" : "bg-white/10",
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12"
          >
            <div>
              <p className="eyebrow">{t.lesson.intro.eyebrow}</p>
              <h1 ref={headingRef} tabIndex={-1} className="font-display mt-4 text-4xl font-medium tracking-tight outline-none sm:text-5xl">
                {t.lesson.intro.title}
              </h1>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-mist-200 sm:text-[17px]">
                {t.lesson.intro.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <Button size="lg" className="mt-8" onClick={() => goTo("task")}>
                {t.lesson.intro.start}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
            <aside className="glass flex flex-col items-center gap-6 self-start rounded-[28px] p-6 sm:p-8">
              <KeyPatternDiagram label={t.lesson.intro.tip} />
              <div className="w-full">
                <p className="flex items-center gap-2 text-sm font-medium text-ion">
                  <Lightbulb className="size-4" aria-hidden />
                  {t.lesson.intro.tipTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{t.lesson.intro.tip}</p>
              </div>
            </aside>
          </motion.section>
        )}

        {phase === "task" && (
          <motion.section
            key="task"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-medium tracking-tight outline-none sm:text-4xl">
                  {t.lesson.task.title}
                </h1>
                <p className="mt-3 text-mist-200 sm:text-lg">{t.lesson.task.prompt}</p>
                <p className="mt-2 text-sm text-mist-500">{t.lesson.task.inputs}</p>
              </div>
              <div className="flex items-center gap-3">
                {attempts > 0 && (
                  <span className="font-mono text-xs text-mist-500">{format(t.lesson.task.attempts, { n: attempts })}</span>
                )}
                <Button
                  variant={attempts >= 2 && !showHint ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setShowHint(true)}
                  disabled={showHint}
                >
                  <Lightbulb className="size-4" aria-hidden />
                  {t.lesson.task.hint}
                </Button>
              </div>
            </div>

            <FeedbackPanel feedback={feedback} showHint={showHint} />

            <div ref={containerRef} className="mt-8">
              <PianoKeyboard
                startMidi={startMidi}
                whiteKeyCount={whiteKeyCount}
                showNoteNames={false}
                highlight={showHint ? [target] : []}
                marks={marks}
                size="lg"
              />
            </div>

            <AudioHint status={audioStatus} />
          </motion.section>
        )}

        {phase === "complete" && result && (
          <motion.section
            key="complete"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mt-10 max-w-xl overflow-hidden rounded-[32px] p-8 text-center ring-1 ring-white/10 sm:p-10"
          >
            <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(79,224,168,0.18),transparent_70%),radial-gradient(90%_80%_at_50%_100%,rgba(106,85,255,0.25),transparent_70%),#0c0c18]" />
            <Burst />
            <motion.span
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="relative mx-auto flex size-20 items-center justify-center rounded-full bg-success text-ink-950 shadow-[0_0_60px_-4px_rgba(79,224,168,0.8)]"
            >
              <Check className="size-10" strokeWidth={3} aria-hidden />
            </motion.span>
            <h1 ref={headingRef} tabIndex={-1} className="font-display mt-7 text-3xl font-medium outline-none sm:text-4xl">
              {t.lesson.complete.title}
            </h1>
            <p className="mt-3 text-mist-200">{t.lesson.complete.body}</p>

            <div className="mt-7" role="status">
              {result.alreadyCompleted ? (
                <p className="mx-auto max-w-sm rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-mist-400 ring-1 ring-white/[0.08]">
                  {t.lesson.complete.alreadyEarned}
                </p>
              ) : (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-5 py-2.5 font-mono text-lg font-medium text-gold ring-1 ring-gold/30"
                >
                  <Sparkles className="size-5" aria-hidden />
                  {format(t.lesson.complete.xpEarned, { xp: result.xpAwarded })}
                </motion.p>
              )}
            </div>

            <div className="mx-auto mt-6 max-w-xs">
              <ProgressBar value={levelInfo.progress} label={t.common.level} />
              <p className="mt-2 font-mono text-xs text-mist-400">
                {format(t.lesson.complete.levelProgress, { level: levelInfo.level, xp: totalXp })}
              </p>
            </div>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/learn/piano">
                {t.lesson.complete.backToAcademy}
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/practice" variant="secondary">
                <Music2 className="size-4" aria-hidden />
                {t.lesson.complete.openStudio}
              </ButtonLink>
              <Button variant="ghost" onClick={restart}>
                <RotateCcw className="size-4" aria-hidden />
                {t.lesson.complete.replay}
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeedbackPanel({ feedback, showHint }: { feedback: Feedback | null; showHint: boolean }) {
  const { t } = useI18n();
  const verdict = feedback?.verdict;
  const note = feedback ? midiToNoteName(feedback.midi) : "";

  const message =
    verdict === "correct"
      ? t.lesson.task.correct
      : verdict === "wrong-octave"
        ? format(t.lesson.task.wrongOctave, { note })
        : verdict === "wrong-note"
          ? format(t.lesson.task.wrongNote, { note })
          : t.lesson.task.listening;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-6 flex min-h-16 items-center gap-4 rounded-2xl px-5 py-4 ring-1 transition-colors duration-300",
        verdict === "correct" && "bg-success/10 ring-success/40",
        (verdict === "wrong-note" || verdict === "wrong-octave") && "bg-warn/[0.08] ring-warn/30",
        !verdict && "bg-white/[0.03] ring-white/[0.08]",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          verdict === "correct" && "bg-success text-ink-950",
          (verdict === "wrong-note" || verdict === "wrong-octave") && "bg-warn/15 text-warn",
          !verdict && "bg-ion/10 text-ion",
        )}
      >
        {verdict === "correct" ? (
          <Check className="size-5" strokeWidth={3} aria-hidden />
        ) : verdict ? (
          <span className="font-mono text-[11px] font-semibold">{note}</span>
        ) : (
          <Ear className="size-4.5 animate-pulse" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={feedback?.id ?? "idle"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn("text-sm sm:text-base", verdict === "correct" ? "font-medium text-success" : "text-mist-200")}
          >
            {message}
          </motion.p>
        </AnimatePresence>
        {showHint && verdict !== "correct" && (
          <p className="mt-1 text-xs text-pulse">{t.lesson.task.hintActive}</p>
        )}
      </div>
    </div>
  );
}

function AudioHint({ status }: { status: ReturnType<typeof useAudioStatus> }) {
  const { t } = useI18n();
  if (status === "ready") return null;
  const isProblem = status === "error" || status === "unsupported";
  return (
    <p className={cn("mt-4 flex items-center justify-center gap-2 text-center text-xs", isProblem ? "text-warn" : "text-mist-500")}>
      <Volume2 className="size-3.5" aria-hidden />
      {t.audio[status]}
    </p>
  );
}

/** A one-shot ring of sparks behind the success check. */
function Burst() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-[4.5rem] left-1/2 sm:top-[5.25rem]">
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: i % 2 ? "#2fd8ee" : "#8b7bff" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 110, y: Math.sin(angle) * 110, opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        );
      })}
    </div>
  );
}
