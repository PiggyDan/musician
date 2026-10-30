"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { INSTRUMENTS } from "@/content/instruments";
import { COMPOSERS, type ScoreEntry } from "@/content/sheet-music/catalog";
import { useI18n } from "@/i18n/use-i18n";
import { scoreNotesTimed } from "@/lib/sheet-music/library";
import { cn } from "@/lib/cn";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";

/**
 * A miniature of the melody itself: each note is a dot at its pitch and time,
 * drawn over a faint staff. Every card's artwork is unique and honest.
 */
function MelodyContour({ score, accent }: { score: ScoreEntry; accent: string }) {
  const { points, path } = useMemo(() => {
    // The melody (upper staff) — its top note when the right hand plays a chord.
    const byStart = new Map<number, { midi: number; start: number; beats: number }>();
    for (const n of scoreNotesTimed(score)) {
      if (n.staff !== 1) continue;
      const prev = byStart.get(n.start);
      if (!prev || n.midi > prev.midi) byStart.set(n.start, n);
    }
    const melody = [...byStart.values()].sort((a, b) => a.start - b.start);
    const end = Math.max(...melody.map((e) => e.start + e.beats));
    const lo = Math.min(...melody.map((e) => e.midi));
    const hi = Math.max(...melody.map((e) => e.midi));
    const span = Math.max(7, hi - lo);
    const pts = melody.map((e) => ({
      x: 8 + ((e.start + e.beats / 2) / end) * 284,
      y: 66 - ((e.midi - lo) / span) * 48,
      long: e.beats >= 2,
    }));
    return { points: pts, path: pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") };
  }, [score]);

  return (
    <svg viewBox="0 0 300 80" aria-hidden className="h-20 w-full">
      {[18, 30, 42, 54, 66].map((y) => (
        <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgb(255 255 255 / 0.06)" />
      ))}
      <path d={path} fill="none" stroke={accent} strokeOpacity={0.35} strokeWidth={1.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.long ? 3.6 : 2.6} fill={p.long ? "none" : accent} stroke={accent} strokeWidth={1.4} />
      ))}
    </svg>
  );
}

export function ScoreCard({ score }: { score: ScoreEntry }) {
  const { t, locale } = useI18n();
  const instrument = INSTRUMENTS.find((i) => i.id === score.instrument)!;
  const composer = COMPOSERS[score.composer];

  return (
    <Link
      href={`/sheet-music/${score.id}`}
      className="group relative flex h-full flex-col rounded-3xl bg-white/[0.025] p-5 ring-1 ring-white/[0.08] transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/[0.045] hover:shadow-[0_24px_60px_-28px_rgba(106,85,255,0.7)]"
    >
      <div className="rounded-2xl bg-ink-900/70 px-2 ring-1 ring-white/[0.05]">
        <MelodyContour score={score} accent={instrument.accent} />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-medium">{score.title[locale]}</h2>
          <p className="mt-0.5 truncate text-sm text-mist-400">
            {composer.name[locale]} · {score.year}
          </p>
        </div>
        <ArrowUpRight className="mt-1 size-4 shrink-0 text-mist-500 transition-colors group-hover:text-ion" aria-hidden />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] py-1 pr-2.5 pl-1.5 text-xs text-mist-200">
          <InstrumentGlyph id={score.instrument} className="size-4" color={instrument.accent} />
          {t.instruments[score.instrument].name}
        </span>
        {score.bass && (
          <span className="rounded-full bg-ion/10 px-2.5 py-1 text-xs text-ion">{t.sheetMusic.viewer.grandStaff}</span>
        )}
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs",
            score.difficulty === "beginner" ? "bg-success/10 text-success" : "bg-pulse/15 text-pulse",
          )}
        >
          {t.sheetMusic.difficulty[score.difficulty]}
        </span>
        <span className="rounded-full px-2 py-1 font-mono text-[10px] tracking-wide text-mist-500 uppercase ring-1 ring-white/10">
          {t.sheetMusic.license[score.license]}
        </span>
      </div>
    </Link>
  );
}
