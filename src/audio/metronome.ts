import { audioEngine } from "./engine";

export interface ClickTrack {
  /** performance.now() time at which `startBeat` is *heard* (output latency included). */
  zeroPerfMs: number;
  beatMs: number;
  stop: () => void;
}

const LEAD_MS = 150;
const LOOKAHEAD_SEC = 0.15;
const TICK_MS = 25;

/**
 * Plays metronome ticks on the audio clock (sample-accurate, unlike timers)
 * with a small look-ahead scheduler, so stop() takes effect within ~150 ms.
 *
 * Ticks land on whole beats from `startBeat` (which may be fractional, e.g.
 * when resuming mid-measure) for `beats` beats. A tick is accented when
 * `(beat - accentOffset)` starts a bar — use `accentOffset` for pickups.
 * Without running audio it still returns a valid timeline, so visuals and
 * scoring keep working silently.
 */
export function startClickTrack({
  bpm,
  beats,
  beatsPerBar,
  startBeat = 0,
  accentOffset = 0,
  silent = false,
}: {
  bpm: number;
  beats: number;
  beatsPerBar: number;
  startBeat?: number;
  accentOffset?: number;
  silent?: boolean;
}): ClickTrack {
  const beatSec = 60 / bpm;
  const audioNow = audioEngine.audioTime();
  const zeroPerfMs = performance.now() + LEAD_MS + audioEngine.outputLatencySec() * 1000;
  const track: ClickTrack = { zeroPerfMs, beatMs: beatSec * 1000, stop: () => {} };
  if (audioNow === null || silent) return track;

  const zeroAudio = audioNow + LEAD_MS / 1000;
  const end = startBeat + beats;
  let beat = Math.ceil(startBeat - 1e-6);
  const schedule = () => {
    const now = audioEngine.audioTime();
    if (now === null) return;
    while (beat < end - 1e-6) {
      const time = zeroAudio + (beat - startBeat) * beatSec;
      if (time >= now + LOOKAHEAD_SEC) break;
      const inBar = (((beat - accentOffset) % beatsPerBar) + beatsPerBar) % beatsPerBar;
      audioEngine.click(time, inBar === 0);
      beat += 1;
    }
    if (beat >= end - 1e-6) window.clearInterval(timer);
  };
  const timer = window.setInterval(schedule, TICK_MS);
  schedule();
  track.stop = () => window.clearInterval(timer);
  return track;
}
