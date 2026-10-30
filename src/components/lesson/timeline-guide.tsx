"use client";

import { useEffect, useMemo, useRef } from "react";
import type { TimedNote } from "@/content/lessons/types";
import { lengthInBeats } from "@/content/lessons/timing";
import type { HitStatus } from "@/lib/lessons/timing";
import { cn } from "@/lib/cn";
import { isBlackKey, pitchClassName, type Midi } from "@/lib/music/notes";

export interface GuideClock {
  /** performance.now() time of beat 0 of the music (after the count-in). */
  startPerfMs: number;
  beatMs: number;
}

const NOW_X = 0.18; // the "play now" line, as a fraction of the width

/**
 * Animated note guide: notes glide right-to-left toward the "now" line.
 * Song mode stacks notes in pitch lanes; rhythm mode uses a single lane.
 * Position updates run in requestAnimationFrame on a transform (no React
 * re-render per frame); `onBeat` fires once per whole beat for coarse UI.
 */
export function TimelineGuide({
  notes,
  mode,
  countInBeats,
  beatsPerBar,
  clock,
  statuses,
  onBeat,
  label,
}: {
  notes: readonly TimedNote[];
  mode: "rhythm" | "song";
  countInBeats: number;
  beatsPerBar: number;
  clock: GuideClock | null;
  statuses: readonly HitStatus[] | null;
  onBeat?: (beat: number) => void;
  label: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const onBeatRef = useRef(onBeat);
  useEffect(() => {
    onBeatRef.current = onBeat;
  });

  const length = lengthInBeats(notes);
  const lanes: Midi[] = useMemo(() => {
    if (mode === "rhythm") return [notes[0]?.midi ?? 60];
    const lo = Math.min(...notes.map((n) => n.midi));
    const hi = Math.max(...notes.map((n) => n.midi));
    const list: Midi[] = [];
    for (let m = hi; m >= lo; m -= 1) if (!isBlackKey(m)) list.push(m);
    return list;
  }, [notes, mode]);

  const height = mode === "song" ? Math.max(150, lanes.length * 34 + 24) : 104;
  const pxPerBeat = 84;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    let frame = 0;
    let lastBeat = Number.NaN;

    const place = (beat: number) => {
      const nowX = viewport.clientWidth * NOW_X;
      track.style.transform = `translate3d(${nowX - beat * pxPerBeat}px,0,0)`;
    };

    if (!clock) {
      place(-1.2);
      return;
    }
    const loop = () => {
      const beat = (performance.now() - clock.startPerfMs) / clock.beatMs;
      place(beat);
      const whole = Math.floor(beat);
      if (whole !== lastBeat) {
        lastBeat = whole;
        onBeatRef.current?.(whole);
      }
      if (beat < length + 2) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [clock, length]);

  const laneHeight = (height - 24) / lanes.length;
  const laneOf = (midi: Midi) => Math.max(0, lanes.indexOf(midi));

  return (
    <div
      ref={viewportRef}
      role="img"
      aria-label={label}
      className="relative overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#10101d,#0a0a14)] ring-1 ring-white/10"
      style={{ height }}
    >
      {/* Lane guides */}
      {lanes.map((midi, i) => (
        <div
          key={midi}
          aria-hidden
          className="absolute inset-x-0 border-t border-white/[0.04]"
          style={{ top: 12 + i * laneHeight + laneHeight / 2 }}
        >
          {mode === "song" && (
            <span className="absolute left-2 -translate-y-1/2 font-mono text-[10px] text-mist-500">{pitchClassName(midi)}</span>
          )}
        </div>
      ))}

      <div ref={trackRef} aria-hidden className="absolute inset-y-0 left-0 will-change-transform">
        {/* Beat grid, including the count-in */}
        {Array.from({ length: countInBeats + length + 1 }, (_, i) => i - countInBeats).map((beat) => (
          <div
            key={beat}
            className={cn("absolute inset-y-2 w-px", beat >= 0 && beat % beatsPerBar === 0 ? "bg-white/15" : "bg-white/[0.05]")}
            style={{ left: beat * pxPerBeat }}
          >
            {beat < 0 && (
              <span className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 font-display text-2xl text-white/15">
                {beat + countInBeats + 1}
              </span>
            )}
          </div>
        ))}

        {notes.map((note, i) => {
          const status = statuses?.[i];
          return (
            <div
              key={i}
              className={cn(
                "absolute flex items-center rounded-xl px-2 font-mono text-xs font-semibold transition-colors duration-200",
                !status || status === "missed"
                  ? status === "missed"
                    ? "bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/40"
                    : "bg-spectrum text-white shadow-[0_0_18px_-4px_rgba(79,139,255,0.9)]"
                  : status === "perfect" || status === "good"
                    ? "bg-success text-ink-950 shadow-[0_0_20px_-4px_rgba(79,224,168,0.9)]"
                    : status === "wrong-pitch"
                      ? "bg-rose-500/70 text-white"
                      : "bg-warn/80 text-ink-950",
              )}
              style={{
                left: note.beat * pxPerBeat,
                width: Math.max(28, note.beats * pxPerBeat - 8),
                top: 12 + laneOf(note.midi) * laneHeight + laneHeight * 0.14,
                height: laneHeight * 0.72,
              }}
            >
              {mode === "song" ? pitchClassName(note.midi) : ""}
            </div>
          );
        })}
      </div>

      {/* The "now" line */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-ion shadow-[0_0_16px_2px_rgba(47,216,238,0.7)]" style={{ left: `${NOW_X * 100}%` }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#0a0a14] to-transparent" />
    </div>
  );
}
