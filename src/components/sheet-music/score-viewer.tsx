"use client";

import { ArrowLeft, BookOpen, Download, FileText, Pause, Play, Printer, RotateCcw, Square, Target, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { audioEngine } from "@/audio/engine";
import { useNoteEvents } from "@/audio/hooks";
import { INSTRUMENTS } from "@/content/instruments";
import { COMPOSERS, LICENSES, getScore } from "@/content/sheet-music/catalog";
import { useElementWidth } from "@/hooks/use-element-width";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { getPianoLesson } from "@/content/lessons/piano";
import { evaluateHeld } from "@/lib/lessons/evaluate";
import {
  musicXmlPath,
  pdfPath,
  practiceTargets,
  scoreMusicXml,
  scoreNotesTimed,
  scoreSteps,
  type PracticeHand,
} from "@/lib/sheet-music/library";
import { cn } from "@/lib/cn";
import { isBlackKey, midiToNoteName, pitchClassName, type Midi } from "@/lib/music/notes";
import { buttonClasses, Button } from "@/components/ui/button";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { AudioHint } from "@/components/ui/audio-hint";
import { FeedbackPanel } from "@/components/lesson/feedback-panel";
import { useFlashMarks } from "@/components/lesson/steps/shared";
import { PianoKeyboard } from "@/components/piano/piano-keyboard";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";
import { ScoreSheet } from "./score-sheet";
import { useScorePlayback } from "./use-score-playback";

const TEMPO_STEPS = { min: 50, max: 150 };

export function ScoreViewer({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const v = t.sheetMusic.viewer;
  const score = getScore(id)!;
  const composer = COMPOSERS[score.composer];
  const license = LICENSES[score.license];
  const instrument = INSTRUMENTS.find((i) => i.id === score.instrument)!;

  const xml = useMemo(() => scoreMusicXml(score, { forDisplay: true }), [score]);
  const steps = useMemo(() => scoreSteps(score), [score]);
  const allNotes = useMemo(() => scoreNotesTimed(score).map((n) => n.midi), [score]);
  const endBeat = useMemo(() => Math.max(...scoreNotesTimed(score).map((n) => n.start + n.beats)), [score]);
  const grand = Boolean(score.bass);
  const relatedLesson = score.relatedLesson ? getPianoLesson(score.relatedLesson) : undefined;

  const [tempoPct, setTempoPct] = useState(100);
  const [metronome, setMetronome] = useState(false);
  const [practice, setPractice] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [hand, setHand] = useState<PracticeHand>("both");
  const targets = useMemo(() => practiceTargets(steps, hand), [steps, hand]);
  const [feedback, setFeedback] = useState<{ id: number; ok: boolean; midi: Midi } | null>(null);
  const [marks, flash] = useFlashMarks();

  const bpm = Math.round((score.tempo * tempoPct) / 100);
  const playback = useScorePlayback(steps, {
    beatsPerBar: score.time[0] * (4 / score.time[1]),
    pickupBeats: score.pickup ? firstMeasureBeats(score.melody) : 0,
    endBeat,
  });

  const practiceDone = practiceIndex >= targets.length;
  const target = practiceDone ? null : targets[practiceIndex];
  const cursor = practice ? (target ? target.step : null) : playback.index;

  // Wait mode: the score moves on once every note of the current moment is held
  // (a single note, a chord, or both hands together).
  useNoteEvents((event) => {
    if (!practice || event.type !== "on" || event.source === "demo" || !target) return;
    if (!target.midis.includes(event.midi)) {
      setFeedback((f) => ({ id: (f?.id ?? 0) + 1, ok: false, midi: event.midi }));
      flash(event.midi, "wrong");
      return;
    }
    if (evaluateHeld(audioEngine.getActiveNotes(), target.midis).missing.length > 0) return;
    setFeedback((f) => ({ id: (f?.id ?? 0) + 1, ok: true, midi: event.midi }));
    flash(event.midi, "correct");
    setPracticeIndex((i) => i + 1);
  });

  const resetPractice = () => {
    setPracticeIndex(0);
    setFeedback(null);
  };

  const togglePractice = () => {
    playback.stop();
    setPractice((p) => !p);
    resetPractice();
  };

  const togglePlay = () => {
    if (playback.playing) playback.pause();
    else void playback.play({ bpm, metronome });
  };

  // Tempo/metronome changes apply immediately while playing.
  const restartIfPlaying = (next: { bpm?: number; metronome?: boolean }) => {
    if (!playback.playing) return;
    playback.pause();
    void playback.play({ bpm: next.bpm ?? bpm, metronome: next.metronome ?? metronome });
  };

  const keyName = t.sheetMusic.keys[String(score.keyFifths) as keyof typeof t.sheetMusic.keys] ?? "";
  const expectedLabel = target ? target.midis.map(midiToNoteName).join(" + ") : "";
  const message = practiceDone
    ? v.practiceDone
    : feedback && !feedback.ok
      ? format(v.practiceWrong, { note: midiToNoteName(feedback.midi), expected: expectedLabel })
      : format(v.practiceProgress, { n: practiceIndex + 1, total: targets.length }) +
        (target && target.midis.length > 1 ? ` · ${v.practiceTogether}` : "");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32 print:max-w-none print:p-0">
      <Link
        href="/sheet-music"
        className="inline-flex items-center gap-2 rounded-full py-1 pr-3 text-sm text-mist-400 transition-colors hover:text-mist-50 print:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {v.back}
      </Link>

      <header className="mt-6 print:hidden">
        <h1 className="font-display text-[2rem] leading-tight font-medium tracking-tight sm:text-5xl">{score.title[locale]}</h1>
        <p className="mt-2 text-mist-400">
          {composer.name[locale]}
          {"lifespan" in composer ? ` (${composer.lifespan})` : ""} · {score.year}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill>
            <InstrumentGlyph id={score.instrument} className="size-4" color={instrument.accent} />
            {t.instruments[score.instrument].name}
          </Pill>
          <Pill>{t.sheetMusic.difficulty[score.difficulty]}</Pill>
          <Pill>{t.sheetMusic.genre[score.genre]}</Pill>
          <Pill>
            {v.key}: {keyName}
          </Pill>
          <Pill>
            {v.time}: {score.time[0]}/{score.time[1]}
          </Pill>
          <Pill>{t.sheetMusic.license[score.license]}</Pill>
        </div>
      </header>

      {/* Transport */}
      <div className="glass mt-6 flex flex-wrap items-center gap-x-5 gap-y-4 rounded-3xl p-4 sm:px-5 print:hidden">
        <div className="flex items-center gap-2">
          <Button onClick={togglePlay} disabled={practice} aria-label={playback.playing ? v.pause : v.play}>
            {playback.playing ? <Pause className="size-4 fill-current" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
            <span className="max-sm:sr-only">{playback.playing ? v.pause : v.play}</span>
          </Button>
          <Button variant="secondary" onClick={playback.stop} disabled={practice || playback.index === null} aria-label={v.stop}>
            <Square className="size-4" aria-hidden />
          </Button>
        </div>

        <label className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-72">
          <Timer className="size-4 shrink-0 text-mist-400" aria-hidden />
          <span className="sr-only">{v.tempo}</span>
          <input
            type="range"
            min={TEMPO_STEPS.min}
            max={TEMPO_STEPS.max}
            step={5}
            value={tempoPct}
            onChange={(e) => {
              const pct = Number(e.target.value);
              setTempoPct(pct);
              restartIfPlaying({ bpm: Math.round((score.tempo * pct) / 100) });
            }}
            aria-valuetext={format(v.bpm, { bpm })}
            className="h-1.5 flex-1 cursor-pointer accent-[#8b7bff]"
          />
          <span className="w-16 text-right font-mono text-xs text-mist-200">{format(v.bpm, { bpm })}</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            pressed={metronome}
            onChange={(on) => {
              setMetronome(on);
              restartIfPlaying({ metronome: on });
            }}
          >
            {v.metronome}
          </Toggle>
          <Toggle pressed={practice} onChange={togglePractice}>
            <Target className="size-3.5" aria-hidden />
            {v.practice}
          </Toggle>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <a href={musicXmlPath(score)} download={`${score.id}.musicxml`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <Download className="size-4" aria-hidden />
            {v.musicxml}
          </a>
          {score.formats.includes("pdf") && (
            <a href={pdfPath(score)} download className={buttonClasses({ variant: "ghost", size: "sm" })}>
              <FileText className="size-4" aria-hidden />
              {v.pdf}
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            {v.print}
          </Button>
        </div>
      </div>

      {/* The score, on paper */}
      <div
        data-expected-steps={steps.length}
        className="mt-4 overflow-hidden rounded-[28px] bg-[#fbfaf7] p-3 shadow-[0_30px_80px_-40px_rgba(106,85,255,0.6)] ring-1 ring-white/10 sm:p-6 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <ScoreSheet xml={xml} cursor={cursor} loadingLabel={v.loading} errorLabel={v.error} />
        <p className="hidden px-2 pt-4 text-[10px] leading-snug text-neutral-600 print:block">
          {score.title.en} — {composer.name.en}. {score.source.en} {score.attribution} {license.name} ({license.url}).
        </p>
      </div>

      {/* Practice + keyboard */}
      <section className="mt-6 print:hidden" aria-label={v.practiceTitle}>
        {practice && (
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-mist-400">{v.practiceBody}</p>
              {grand && (
                <div role="group" aria-label={v.hands} className="flex rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
                  {(["right", "left", "both"] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={hand === h}
                      onClick={() => {
                        setHand(h);
                        resetPractice();
                      }}
                      className={cn(
                        "h-8 rounded-full px-3 text-xs transition-colors",
                        hand === h ? "bg-white/[0.12] text-mist-50" : "text-mist-400 hover:text-mist-50",
                      )}
                    >
                      {v.hand[h]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <FeedbackPanel
              className="mt-3"
              tone={practiceDone ? "correct" : !feedback ? "idle" : feedback.ok ? "correct" : "wrong"}
              message={message}
              messageKey={practiceDone ? "done" : (feedback?.id ?? "idle")}
              badge={feedback && !feedback.ok ? midiToNoteName(feedback.midi) : undefined}
              detail={
                practiceDone ? (
                  <button
                    type="button"
                    onClick={resetPractice}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs text-ion hover:underline"
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    {v.practiceRestart}
                  </button>
                ) : null
              }
            />
          </div>
        )}
        <ScoreKeyboard notes={allNotes} highlight={practice && target ? target.midis : []} marks={marks} />
        <div className="mt-3 space-y-1 text-center text-xs text-mist-500">
          {score.clef === "treble-8vb" && <p>{v.concertPitch}</p>}
          <p>{v.playbackNote}</p>
          {grand && <p>{v.computerKeysTwoHands}</p>}
        </div>
        {relatedLesson && (
          <Link
            href={`/learn/piano/lesson/${relatedLesson.slug}`}
            className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-pulse/10 px-4 py-2 text-sm text-mist-50 ring-1 ring-pulse/40 transition-colors hover:bg-pulse/15"
          >
            <BookOpen className="size-4 text-pulse" aria-hidden />
            {format(v.relatedLesson, { n: relatedLesson.order, title: t.lessons[relatedLesson.i18nKey].title })}
          </Link>
        )}
        <AudioHint className="mt-3" iosOnly />
      </section>

      {/* Source & license */}
      <section className="glass mt-8 rounded-[28px] p-6 sm:p-8 print:hidden" aria-labelledby="license-title">
        <h2 id="license-title" className="font-display text-xl font-medium">
          {v.details}
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <Detail label={v.source}>{score.source[locale]}</Detail>
          <Detail label={v.composition}>{score.compositionStatus[locale]}</Detail>
          <Detail label={v.license}>
            <a href={license.url} target="_blank" rel="noopener noreferrer license" className="text-ion hover:underline">
              {license.name}
            </a>
          </Detail>
          <Detail label={v.attribution}>{score.attribution}</Detail>
          <Detail label={v.formats}>{score.formats.map((f) => (f === "pdf" ? v.pdf : v.musicxml)).join(" · ")}</Detail>
        </dl>
      </section>
    </div>
  );
}

/** Beats in the first (pickup) measure, so metronome accents land on bar lines. */
function firstMeasureBeats(melody: string): number {
  const sixteenths = { w: 16, h: 8, q: 4, "8": 2, "16": 1 } as const;
  return melody
    .split("|")[0]
    .trim()
    .split(/\s+/)
    .reduce((sum, token) => {
      const [, code] = token.split(":");
      const base = sixteenths[code.replace(".", "") as keyof typeof sixteenths];
      return sum + (code.endsWith(".") ? base * 1.5 : base) / 4;
    }, 0);
}

/** Piano sized to the score's range, playable from the computer keyboard. */
function ScoreKeyboard({
  notes,
  highlight,
  marks,
}: {
  notes: readonly Midi[];
  highlight: readonly Midi[];
  marks: ReturnType<typeof useFlashMarks>[0];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 900);
  const lo = Math.min(...notes);
  const hi = Math.max(...notes);
  // Start on the C at or below the lowest note, so the computer "A" key plays it.
  const baseC = lo - (lo % 12);
  let needed = 0;
  for (let m = baseC; m <= hi; m += 1) if (!isBlackKey(m)) needed += 1;
  const fit = Math.max(8, Math.floor(width / 34));
  const fitsFromC = needed + 1 <= fit;
  // On narrow screens, start at the lowest note instead so the melody stays visible.
  let start = baseC;
  if (!fitsFromC) start = isBlackKey(lo) ? lo - 1 : lo;
  const count = fitsFromC ? Math.min(Math.max(needed + 1, 8), fit) : fit;

  useComputerKeyboard({ baseMidi: baseC });
  useEffect(() => audioEngine.preload(), []);

  return (
    <div ref={ref}>
      <PianoKeyboard startMidi={start} whiteKeyCount={count} keyHintBase={baseC} highlight={highlight} marks={marks} size="md" />
      <p className="sr-only">{notes.map((m) => pitchClassName(m)).join(" ")}</p>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-mist-200 ring-1 ring-white/10">
      {children}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-mist-500 uppercase">{label}</dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-mist-200">{children}</dd>
    </div>
  );
}

function Toggle({ pressed, onChange, children }: { pressed: boolean; onChange: (value: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm ring-1 transition-colors",
        pressed ? "bg-pulse/15 text-mist-50 ring-pulse/40" : "bg-white/[0.03] text-mist-400 ring-white/10 hover:text-mist-200",
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", pressed ? "bg-ion shadow-[0_0_8px_#2fd8ee]" : "bg-mist-500")} />
      {children}
    </button>
  );
}
