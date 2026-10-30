import { audioEngine } from "./engine";

export interface ClickTrack {
  /** performance.now() time at which beat 0 is *heard* (output latency included). */
  zeroPerfMs: number;
  beatMs: number;
  stop: () => void;
}

const LEAD_MS = 150;
const LOOKAHEAD_SEC = 0.15;
const TICK_MS = 25;

/**
 * Plays `beats` metronome ticks on the audio clock (sample-accurate, unlike
 * timers) using a small look-ahead scheduler, so stop() takes effect within
 * ~150 ms. Without running audio it still returns a valid timeline, so
 * visuals and scoring keep working silently.
 */
export function startClickTrack({
  bpm,
  beats,
  beatsPerBar,
  silent = false,
}: {
  bpm: number;
  beats: number;
  beatsPerBar: number;
  silent?: boolean;
}): ClickTrack {
  const beatSec = 60 / bpm;
  const audioNow = audioEngine.audioTime();
  const zeroPerfMs = performance.now() + LEAD_MS + audioEngine.outputLatencySec() * 1000;
  const track: ClickTrack = { zeroPerfMs, beatMs: beatSec * 1000, stop: () => {} };
  if (audioNow === null || silent) return track;

  const zeroAudio = audioNow + LEAD_MS / 1000;
  let next = 0;
  const schedule = () => {
    const now = audioEngine.audioTime();
    if (now === null) return;
    while (next < beats && zeroAudio + next * beatSec < now + LOOKAHEAD_SEC) {
      audioEngine.click(zeroAudio + next * beatSec, next % beatsPerBar === 0);
      next += 1;
    }
    if (next >= beats) window.clearInterval(timer);
  };
  const timer = window.setInterval(schedule, TICK_MS);
  schedule();
  track.stop = () => window.clearInterval(timer);
  return track;
}
