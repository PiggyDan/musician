"use client";

import { ArrowRight, Headphones, Play, RotateCcw, Square, Turtle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { audioEngine } from "@/audio/engine";
import { useNoteEvents } from "@/audio/hooks";
import { startClickTrack, type ClickTrack } from "@/audio/metronome";
import { lengthInBeats } from "@/content/lessons/timing";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import {
  BEGINNER_TOLERANCES,
  dominantProblem,
  hasPassed,
  isOnTime,
  scoreTimedPerformance,
  type ExpectedHit,
  type HitStatus,
  type PlayedHit,
  type TimingScore,
} from "@/lib/lessons/timing";
import { cn } from "@/lib/cn";
import { useSettingsStore } from "@/store/settings";
import { Button } from "@/components/ui/button";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";
import { FeedbackPanel } from "../feedback-panel";
import { LessonKeyboard } from "../lesson-keyboard";
import { TimelineGuide, type GuideClock } from "../timeline-guide";
import { StepHeader, type StepProps } from "./shared";

type Phase = "idle" | "demo" | "running" | "result";

const SLOW_FACTOR = 0.75;
const PAD_SOURCE = "pad";

/**
 * Play in time with a metronome. "rhythm" mode accepts any key (or the tap
 * pad); "song" mode also checks pitch. Scoring is live, with a summary and a
 * targeted tip at the end.
 */
export function TimedStep({ step, copy, onComplete, headingRef }: StepProps<"play-timed">) {
  const { t } = useI18n();
  const tt = t.lesson.timed;
  const [phase, setPhase] = useState<Phase>("idle");
  const [slow, setSlow] = useState(false);
  const [clock, setClock] = useState<GuideClock | null>(null);
  const [beat, setBeat] = useState(-Infinity);
  const [score, setScore] = useState<TimingScore | null>(null);
  const [last, setLast] = useState<{ id: number; status: HitStatus } | null>(null);
  const [endAt, setEndAt] = useState(0);

  // Measured device delay (Profile → timing calibration): taps are shifted back by it.
  const latencyMs = useSettingsStore((s) => s.latencyMs);
  const bpm = slow ? Math.round(step.bpm * SLOW_FACTOR) : step.bpm;
  const beatMs = 60_000 / bpm;
  const length = lengthInBeats(step.notes);
  const isSong = step.mode === "song";

  const expected = useRef<ExpectedHit[]>([]);
  const plays = useRef<PlayedHit[]>([]);
  const track = useRef<ClickTrack | null>(null);
  const cancelDemo = useRef<(() => void) | null>(null);

  const stopSound = useCallback(() => {
    track.current?.stop();
    track.current = null;
    cancelDemo.current?.();
    cancelDemo.current = null;
  }, []);

  useEffect(() => stopSound, [stopSound]);

  const begin = async (kind: "demo" | "running") => {
    await audioEngine.unlock();
    stopSound();
    const clicks = startClickTrack({ bpm, beats: step.countInBeats + length, beatsPerBar: step.beatsPerBar });
    track.current = clicks;
    const startPerfMs = clicks.zeroPerfMs + step.countInBeats * beatMs;
    expected.current = step.notes.map((n) => ({ timeMs: startPerfMs + n.beat * beatMs, midi: n.midi }));
    plays.current = [];

    if (kind === "demo") {
      const offsetSec = (startPerfMs - performance.now()) / 1000;
      cancelDemo.current = audioEngine.playTimed(
        step.notes.map((n) => ({ midi: n.midi, at: offsetSec + (n.beat * beatMs) / 1000, duration: (n.beats * beatMs * 0.85) / 1000 })),
      );
    }
    setScore(kind === "running" ? scoreTimedPerformance(expected.current, [], { matchPitch: isSong }) : null);
    setLast(null);
    setBeat(-step.countInBeats);
    setClock({ startPerfMs, beatMs });
    setEndAt(startPerfMs + length * beatMs + BEGINNER_TOLERANCES.windowMs);
    setPhase(kind);
  };

  // End of the take (effect-driven so a hidden/shown route still finishes).
  useEffect(() => {
    if (phase !== "demo" && phase !== "running") return;
    const id = window.setTimeout(() => {
      stopSound();
      if (phase === "running") {
        setScore(scoreTimedPerformance(expected.current, plays.current, { matchPitch: isSong }));
        setPhase("result");
      } else {
        setPhase("idle");
        setClock(null);
      }
    }, Math.max(0, endAt - performance.now()));
    return () => window.clearTimeout(id);
  }, [phase, endAt, isSong, stopSound]);

  useNoteEvents((event) => {
    if (phase !== "running" || event.type !== "on" || event.source === "demo") return;
    const now = performance.now();
    const firstExpected = expected.current[0]?.timeMs ?? now;
    if (now < firstExpected - BEGINNER_TOLERANCES.windowMs) return; // ignore count-in taps
    plays.current.push({ timeMs: now - latencyMs, midi: event.midi });
    const live = scoreTimedPerformance(expected.current, plays.current, { matchPitch: isSong });
    const matched = live.matches[plays.current.length - 1];
    setScore(live);
    // Stray taps don't change the message; they only count against passing.
    if (matched !== null) setLast((prev) => ({ id: (prev?.id ?? 0) + 1, status: live.notes[matched].status }));
  });

  const stop = () => {
    stopSound();
    setPhase("idle");
    setClock(null);
    setScore(null);
  };

  const passed = phase === "result" && score !== null && hasPassed(score, step.passRatio);
  const problem = phase === "result" && score && !passed ? dominantProblem(score) : null;

  // Next notes to play (song mode): everything starting at the next onset —
  // a chord or both hands light up together.
  const guideKeys = useMemo(() => {
    if (!isSong || (phase !== "running" && phase !== "idle")) return [];
    const upcoming = phase === "running" ? step.notes.find((n) => n.beat + Math.min(n.beats, 1) > beat + 0.5) : step.notes[0];
    if (!upcoming) return [];
    return step.notes.filter((n) => n.beat === upcoming.beat).map((n) => n.midi);
  }, [isSong, phase, beat, step.notes]);

  // ── Messages ──
  let tone: "idle" | "correct" | "wrong" = "idle";
  let message = tt.ready;
  if (phase === "demo") message = tt.demo;
  if (phase === "running") {
    if (beat < 0) message = `${tt.countIn} ${Math.min(step.countInBeats, -beat)}`;
    else if (last) {
      tone = isOnTime(last.status) ? "correct" : "wrong";
      message = tt.status[last.status];
    } else message = tt.play;
  }
  if (phase === "result" && score) {
    tone = passed ? "correct" : "wrong";
    message = `${passed ? tt.passed : tt.failed} ${format(tt.result, { hits: score.hits, total: score.notes.length })}`;
  }

  const running = phase === "running" || phase === "demo";

  return (
    <div>
      <StepHeader
        copy={copy}
        headingRef={headingRef}
        aside={
          <>
            <span className="font-mono text-xs text-mist-400">{format(tt.bpm, { bpm })}</span>
            <button
              type="button"
              aria-pressed={slow}
              disabled={running}
              onClick={() => setSlow((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm ring-1 transition-colors disabled:opacity-50",
                slow ? "bg-pulse/15 text-mist-50 ring-pulse/40" : "bg-white/[0.03] text-mist-400 ring-white/10 hover:text-mist-200",
              )}
            >
              <Turtle className="size-4" aria-hidden />
              {tt.slow}
            </button>
          </>
        }
      />

      <div className="mt-6">
        <TimelineGuide
          notes={step.notes}
          mode={step.mode}
          countInBeats={step.countInBeats}
          beatsPerBar={step.beatsPerBar}
          clock={running ? clock : null}
          statuses={
            phase === "result"
              ? (score?.notes.map((n) => n.status) ?? null)
              : phase === "running" && score
                ? // A note is only "missed" once it is more than a window behind the playhead.
                  score.notes.map((n, i) =>
                    n.status === "missed" && step.notes[i].beat > beat - Math.ceil(BEGINNER_TOLERANCES.windowMs / beatMs) - 1 ? null : n.status,
                  )
                : null
          }
          onBeat={setBeat}
          label={copy.prompt ?? copy.title}
        />
      </div>

      <FeedbackPanel
        className="mt-4"
        tone={tone}
        message={message}
        messageKey={phase === "running" ? (beat < 0 ? `c${beat}` : (last?.id ?? "go")) : phase}
        detail={
          problem ? (
            <p className="mt-1 text-xs text-mist-400">
              {tt.tips[problem]}{" "}
              {(problem === "early" || problem === "late") && (
                <Link href="/profile" className="text-ion hover:underline">
                  {t.calibration.hint}
                </Link>
              )}
            </p>
          ) : null
        }
      />

      {phase === "result" && score && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={format(tt.result, { hits: score.hits, total: score.notes.length })}>
          {score.notes.map((n, i) => (
            <li
              key={i}
              title={tt.status[n.status]}
              className={cn(
                "h-2.5 w-6 rounded-full",
                isOnTime(n.status) ? "bg-success" : n.status === "early" || n.status === "late" ? "bg-warn" : "bg-rose-500/70",
              )}
            />
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {phase === "result" && passed ? (
          <Button size="lg" onClick={onComplete} className="max-sm:w-full">
            {tt.continue}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : running ? (
          <Button variant="secondary" onClick={stop}>
            <Square className="size-4" aria-hidden />
            {tt.stop}
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={() => void begin("running")} className="max-sm:flex-1">
              {phase === "result" ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
              {phase === "result" ? tt.tryAgain : tt.start}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => void begin("demo")} className="max-sm:flex-1">
              <Headphones className="size-4" aria-hidden />
              {tt.listen}
            </Button>
          </>
        )}
        {phase === "result" && passed && (
          <Button variant="ghost" onClick={() => void begin("running")}>
            <RotateCcw className="size-4" aria-hidden />
            {tt.tryAgain}
          </Button>
        )}
      </div>

      <div className="mt-8">
        {isSong ? (
          <LessonKeyboard range={step.keyboard} highlight={guideKeys} showNoteNames keyHints />
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <TapPad label={tt.tapPad} />
            <p className="text-center text-sm text-mist-500 sm:max-w-56 sm:text-left">{tt.tapHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** A big touch target that plays C4 — comfortable rhythm practice on phones. */
function TapPad({ label }: { label: string }) {
  const held = useRef(false);
  // No piano is shown in rhythm mode, so wire up the computer keyboard here.
  useComputerKeyboard({ baseMidi: 60 });
  const down = () => {
    held.current = true;
    audioEngine.noteOn(60, PAD_SOURCE, 0.8);
  };
  const up = () => {
    if (!held.current) return;
    held.current = false;
    audioEngine.noteOff(60, PAD_SOURCE);
  };
  useEffect(() => () => audioEngine.releaseSource(PAD_SOURCE), []);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        down();
      }}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          down();
        }
      }}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && up()}
      onContextMenu={(e) => e.preventDefault()}
      className="font-display flex h-32 touch-none items-center justify-center rounded-[28px] bg-[radial-gradient(circle_at_50%_30%,rgba(139,123,255,0.35),transparent_70%),linear-gradient(180deg,#1b1b2e,#0e0e1a)] text-2xl font-medium text-mist-50 ring-1 ring-pulse/40 transition-transform select-none active:scale-[0.98] active:ring-ion sm:h-36"
    >
      {label}
    </button>
  );
}
