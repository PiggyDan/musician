"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { audioEngine } from "@/audio/engine";
import { useActiveNotes } from "@/audio/hooks";
import type { InstrumentId } from "@/content/instruments";
import { LAYOUTS } from "@/content/instrument-layouts";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { midiToNoteName, type Midi } from "@/lib/music/notes";
import type { KeyMark } from "@/components/piano/piano-keyboard";

/**
 * A playable on-screen instrument: a fretboard / fingerboard (strings ×
 * positions) or a harmonica's blow and draw holes. Every cell plays its real
 * pitch through the shared audio engine, so lessons evaluate it exactly like
 * the piano.
 */
export function InstrumentPad({
  instrument,
  highlight = [],
  marks = {},
}: {
  instrument: Exclude<InstrumentId, "piano">;
  highlight?: readonly Midi[];
  marks?: Partial<Record<Midi, KeyMark>>;
}) {
  const { t } = useI18n();
  const id = useId();
  const layout = LAYOUTS[instrument];
  const active = useActiveNotes();
  const activeSet = useMemo(() => new Set(active), [active]);
  const glow = useMemo(() => new Set(highlight), [highlight]);
  const held = useRef(new Map<number, Midi>());
  const source = (pointerId: number) => `pad:${id}:${pointerId}`;

  useEffect(() => {
    audioEngine.preload();
    audioEngine.preloadVoice(instrument);
    const map = held.current;
    return () => {
      map.clear();
      audioEngine.releaseSource(`pad:${id}:`);
    };
  }, [id, instrument]);

  const down = (midi: Midi) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current.set(e.pointerId, midi);
    audioEngine.noteOn(midi, source(e.pointerId), 0.8, instrument);
  };
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    const midi = held.current.get(e.pointerId);
    if (midi === undefined) return;
    held.current.delete(e.pointerId);
    audioEngine.noteOff(midi, source(e.pointerId));
  };
  const keyboard = (midi: Midi) => ({
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        audioEngine.noteOn(midi, `pad:${id}:key`, 0.8, instrument);
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") audioEngine.noteOff(midi, `pad:${id}:key`);
    },
  });

  const cell = (midi: Midi, label: string, sub?: string) => {
    const mark = marks[midi];
    return (
      <button
        key={label}
        type="button"
        data-midi={midi}
        data-active={activeSet.has(midi)}
        aria-label={label}
        onPointerDown={down(midi)}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
        onContextMenu={(e) => e.preventDefault()}
        {...keyboard(midi)}
        className={cn(
          "relative flex min-h-11 touch-none flex-col items-center justify-center rounded-xl font-mono text-[11px] ring-1 transition-[background-color,box-shadow,transform] duration-75 select-none active:scale-95",
          mark === "correct"
            ? "bg-success text-ink-950 ring-success"
            : mark === "wrong"
              ? "bg-warn/30 text-warn ring-warn/50"
              : activeSet.has(midi)
                ? "bg-spectrum text-white ring-pulse shadow-[0_0_20px_-2px_rgba(139,123,255,0.9)]"
                : glow.has(midi)
                  ? "piano-target bg-pulse/25 text-mist-50 ring-pulse"
                  : "bg-white/[0.04] text-mist-300 ring-white/10 hover:bg-white/[0.08]",
        )}
      >
        <span className="font-semibold">{midiToNoteName(midi).replace(/\d/, "")}</span>
        {sub && <span className="text-[9px] opacity-70">{sub}</span>}
      </button>
    );
  };

  if (layout.kind === "harmonica") {
    const p = t.pad;
    return (
      <div className="glass rounded-[24px] p-3 sm:p-4" role="group" aria-label={p.harmonica}>
        {(["blow", "draw"] as const).map((breath) => (
          <div key={breath} className="mb-2 last:mb-0">
            <p className="mb-1.5 text-xs text-mist-400">{breath === "blow" ? p.blow : p.draw}</p>
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {layout[breath].map((midi, i) => cell(midi, `${p.hole} ${i + 1} ${breath === "blow" ? p.blow : p.draw} — ${midiToNoteName(midi)}`, String(i + 1)))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const strings = [...layout.strings].reverse(); // highest string on top
  const p = t.pad;
  return (
    <div className="glass overflow-x-auto rounded-[24px] p-3 sm:p-4" role="group" aria-label={p.fingerboard}>
      <div className="grid min-w-[22rem] gap-1.5" style={{ gridTemplateColumns: `2rem repeat(${layout.positions}, minmax(0, 1fr))` }}>
        <span />
        {Array.from({ length: layout.positions }, (_, n) => (
          <span key={n} className="text-center font-mono text-[10px] text-mist-500">
            {n === 0 ? p.open : n}
          </span>
        ))}
        {strings.map((string) => (
          <div key={string.name} className="contents">
            <span className="flex items-center justify-center font-mono text-xs text-mist-400">{string.name}</span>
            {Array.from({ length: layout.positions }, (_, n) =>
              cell(string.open + n, `${string.name} ${p.string}, ${n === 0 ? p.open : `${layout.fretted ? p.fret : p.position} ${n}`} — ${midiToNoteName(string.open + n)}`),
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-mist-500">{layout.fretted ? p.frettedHint : p.unfrettedHint}</p>
    </div>
  );
}
