"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine, type VoiceId } from "@/audio/engine";
import { startClickTrack, type ClickTrack } from "@/audio/metronome";
import type { CursorStep } from "@/lib/sheet-music/notation";

/** Playback uses the "demo" source so it never counts as the learner's own notes. */
const SOURCE = "demo";

export interface ScorePlayback {
  playing: boolean;
  /** Cursor step currently sounding, or null when stopped. */
  index: number | null;
  play: (options: { bpm: number; metronome: boolean }) => Promise<void>;
  pause: () => void;
  stop: () => void;
}

/**
 * Plays a score (both staves) through the shared audio engine, moving the
 * cursor step by step, with an optional metronome on the audio clock. Pausing
 * keeps the position; play resumes from it.
 */
export function useScorePlayback(
  steps: readonly CursorStep[],
  {
    beatsPerBar,
    pickupBeats,
    endBeat,
    voice = "piano",
  }: { beatsPerBar: number; pickupBeats: number; endBeat: number; voice?: VoiceId },
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
      if (steps.length === 0) return;
      await audioEngine.unlock();
      await audioEngine.waitForVoice(voice);
      halt();
      const from = indexRef.current ?? 0;
      const beatMs = 60_000 / bpm;
      const startBeat = steps[from].start;

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

      for (let i = from; i < steps.length; i += 1) {
        const step = steps[i];
        timers.current.push(
          window.setTimeout(() => {
            indexRef.current = i;
            setIndex(i);
            for (const note of step.notes) audioEngine.noteOn(note.midi, SOURCE, note.staff === 2 ? 0.6 : 0.72, voice);
          }, at(step.start)),
        );
        for (const note of step.notes) {
          timers.current.push(window.setTimeout(() => audioEngine.noteOff(note.midi, SOURCE), at(note.start + note.beats * 0.92)));
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
    [steps, beatsPerBar, pickupBeats, endBeat, voice, halt],
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
