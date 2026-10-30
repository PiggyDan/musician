"use client";

import { Gauge, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { audioEngine } from "@/audio/engine";
import { useNoteEvents } from "@/audio/hooks";
import { startClickTrack, type ClickTrack } from "@/audio/metronome";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { estimateLatency } from "@/lib/lessons/timing";
import { useSettingsStore } from "@/store/settings";
import { Button } from "@/components/ui/button";
import { useAfter } from "@/components/lesson/steps/shared";

const BPM = 90;
const LEAD_IN = 2; // clicks before taps are measured
const CLICKS = 10;

type Phase = "idle" | "running" | "done" | "failed";

/**
 * Measures the learner's combined audio-output + input delay: they tap along
 * with clicks and we take the median offset. Timed exercises subtract it.
 */
export function LatencyCalibration() {
  const { t } = useI18n();
  const c = t.calibration;
  const latencyMs = useSettingsStore((s) => s.latencyMs);
  const calibrated = useSettingsStore((s) => s.latencyCalibrated);
  const setLatency = useSettingsStore((s) => s.setLatency);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<number | null>(null);
  const track = useRef<ClickTrack | null>(null);
  const clicks = useRef<number[]>([]);
  const taps = useRef<number[]>([]);
  const beatMs = 60_000 / BPM;

  useEffect(() => () => track.current?.stop(), []);

  const start = async () => {
    await audioEngine.unlock();
    track.current?.stop();
    const clickTrack = startClickTrack({ bpm: BPM, beats: CLICKS, beatsPerBar: 4 });
    track.current = clickTrack;
    clicks.current = Array.from({ length: CLICKS - LEAD_IN }, (_, i) => clickTrack.zeroPerfMs + (i + LEAD_IN) * beatMs);
    taps.current = [];
    setResult(null);
    setPhase("running");
  };

  const tap = () => {
    if (phase === "running") taps.current.push(performance.now());
  };

  useNoteEvents((event) => {
    if (event.type === "on" && event.source !== "demo") tap();
  });

  // Any key on the computer keyboard counts as a tap while calibrating.
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      taps.current.push(performance.now());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useAfter(phase === "running", CLICKS * beatMs + 600, () => {
    track.current?.stop();
    const ms = estimateLatency(clicks.current, taps.current, beatMs);
    if (ms === null) {
      setPhase("failed");
      return;
    }
    setResult(ms);
    setLatency(ms);
    setPhase("done");
  });

  return (
    <section className="glass rounded-[28px] p-6" aria-labelledby="calibration-title">
      <h2 id="calibration-title" className="flex items-center gap-2 font-medium">
        <Gauge className="size-4 text-ion" aria-hidden />
        {c.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-mist-400">{c.body}</p>

      {phase === "running" ? (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            tap();
          }}
          className="font-display mt-4 flex h-28 w-full touch-none items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_30%,rgba(47,216,238,0.3),transparent_70%),linear-gradient(180deg,#1b1b2e,#0e0e1a)] text-lg text-mist-50 ring-1 ring-ion/40 select-none active:scale-[0.99]"
        >
          {c.tapHere}
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => void start()}>
            {c.start}
          </Button>
          {calibrated && (
            <Button size="sm" variant="ghost" onClick={() => setLatency(null)}>
              <RotateCcw className="size-3.5" aria-hidden />
              {c.reset}
            </Button>
          )}
          <span className="font-mono text-xs text-mist-500">
            {calibrated ? format(c.current, { ms: latencyMs }) : c.notCalibrated}
          </span>
        </div>
      )}
      <p className="mt-3 min-h-5 text-xs" role="status">
        {phase === "running" && <span className="text-mist-400">{c.listening}</span>}
        {phase === "done" && result !== null && (
          <span className="text-success">
            {format(c.result, { ms: result })} · {c.saved}
          </span>
        )}
        {phase === "failed" && <span className="text-warn">{c.failed}</span>}
      </p>
    </section>
  );
}
