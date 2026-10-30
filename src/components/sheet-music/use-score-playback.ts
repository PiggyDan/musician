"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "@/audio/engine";
import { startClickTrack, type ClickTrack } from "@/audio/metronome";
import type { TimelineEvent } from "@/lib/sheet-music/notation";

/** Playback uses the "demo" source so it never counts as the learner's own notes. */
const SOURCE = "demo";

export interface ScorePlayback {
  playing: boolean;
  /** Event currently sounding (for the cursor), or null when stopped. */
  index: number | null;
  play: (options: { bpm: number; metronome: boolean }) => Promise<void>;
  pause: () => void;
  stop: () => void;
}

/**
 * Plays a score timeline through the shared audio engine, with an optional
 * metronome on the audio clock. Pausing keeps the position; play resumes.
 */
export function useScorePlayback(
  timeline: readonly TimelineEvent[],
  { beatsPerBar, pickupBeats }: { beatsPerBar: number; pickupBeats: number },
): ScorePlayback {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const track = useRef<ClickTrack | null>(null);
  const indexRef = useRef<number | null>(null);

  const halt = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    track.current?.stop();
    track.current = null;
    audioEngine.releaseSource(SOURCE);
  }, []);

  const pause = useCallback(() => {
    halt();
    setPlaying(false);
  }, [halt]);

  const stop = useCallback(() => {
    halt();
    setPlaying(false);
    indexRef.current = null;
    setIndex(null);
  }, [halt]);

  const play = useCallback(
    async ({ bpm, metronome }: { bpm: number; metronome: boolean }) => {
      if (timeline.length === 0) return;
      await audioEngine.unlock();
      halt();
      const from = indexRef.current ?? 0;
      const beatMs = 60_000 / bpm;
      const startBeat = timeline[from].start;
      const last = timeline[timeline.length - 1];
      const endBeat = last.start + last.beats;

      const clicks = startClickTrack({
        bpm,
        beats: endBeat - startBeat,
        beatsPerBar,
        startBeat,
        accentOffset: pickupBeats,
        silent: !metronome,
      });
      track.current = clicks;
      // Notes start via timers (heard immediately), clicks via the audio clock
      // (heard after output latency) — align both to what the ear hears.
      const zero = clicks.zeroPerfMs - audioEngine.outputLatencySec() * 1000;
      const at = (beat: number) => Math.max(0, zero + (beat - startBeat) * beatMs - performance.now());

      for (let i = from; i < timeline.length; i += 1) {
        const event = timeline[i];
        timers.current.push(
          window.setTimeout(() => {
            indexRef.current = i;
            setIndex(i);
            if (event.midi !== null) audioEngine.noteOn(event.midi, SOURCE, 0.72);
          }, at(event.start)),
        );
        if (event.midi !== null) {
          const midi = event.midi;
          timers.current.push(
            window.setTimeout(() => audioEngine.noteOff(midi, SOURCE), at(event.start + event.beats * 0.92)),
          );
        }
      }
      timers.current.push(
        window.setTimeout(() => {
          halt();
          setPlaying(false);
          indexRef.current = null;
          setIndex(null);
        }, at(endBeat) + 150),
      );
      setPlaying(true);
    },
    [timeline, beatsPerBar, pickupBeats, halt],
  );

  // Silence everything when the viewer unmounts or its route is hidden.
  useEffect(
    () => () => {
      halt();
      setPlaying(false);
    },
    [halt],
  );

  return { playing, index, play, pause, stop };
}
