import type { Midi } from "@/lib/music/notes";
import { midiToNoteName } from "@/lib/music/notes";

type ToneModule = typeof import("tone");
type Voice = import("tone").PolySynth<import("tone").MonoSynth>;

export type AudioStatus = "idle" | "loading" | "ready" | "error" | "unsupported";

/**
 * Who is holding a note: "keyboard", "pointer:3", "midi:<deviceId>", "demo".
 * A note sounds while at least one source holds it, so the same key pressed by
 * mouse and computer keyboard at once never double-triggers or sticks.
 */
export type NoteSource = string;

export interface NoteEvent {
  type: "on" | "off";
  midi: Midi;
  source: NoteSource;
  velocity: number;
}

type Listener = () => void;
type NoteListener = (event: NoteEvent) => void;

const EMPTY: readonly Midi[] = Object.freeze([]);

/**
 * Framework-agnostic audio engine. Tone.js is loaded lazily on the client so it
 * never runs during server rendering and stays out of the initial bundle.
 */
class AudioEngine {
  private tone: ToneModule | null = null;
  private voice: Voice | null = null;
  private master: import("tone").Volume | null = null;
  private loadPromise: Promise<ToneModule> | null = null;
  private readyPromise: Promise<boolean> | null = null;

  private status: AudioStatus = "idle";
  private volume = 0.8;

  private held = new Map<Midi, Set<NoteSource>>();
  private velocities = new Map<Midi, number>();
  /** Notes pressed before audio was ready; flushed once the synth exists. */
  private pending = new Set<Midi>();
  private activeSnapshot: readonly Midi[] = EMPTY;

  private statusListeners = new Set<Listener>();
  private activeListeners = new Set<Listener>();
  private noteListeners = new Set<NoteListener>();
  private lifecycleBound = false;

  // ── Subscriptions (shaped for useSyncExternalStore) ─────────────────────────

  getStatus = (): AudioStatus => this.status;
  getActiveNotes = (): readonly Midi[] => this.activeSnapshot;

  subscribeStatus = (listener: Listener): (() => void) => {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  };

  subscribeActive = (listener: Listener): (() => void) => {
    this.activeListeners.add(listener);
    return () => this.activeListeners.delete(listener);
  };

  subscribeNotes = (listener: NoteListener): (() => void) => {
    this.noteListeners.add(listener);
    return () => this.noteListeners.delete(listener);
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Downloads Tone.js ahead of the first gesture. Does not create an AudioContext. */
  preload(): void {
    if (typeof window === "undefined") return;
    this.bindLifecycle();
    void this.loadTone().catch(() => {
      // Surfaced again (and reported) when the user actually tries to play.
    });
  }

  /**
   * Starts audio. Call from inside a user gesture (pointerdown/keydown):
   * browsers only allow an AudioContext to start in response to one.
   */
  unlock(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false);
    this.bindLifecycle();
    if (this.status === "ready") return Promise.resolve(true);

    // If Tone is already loaded, resume synchronously within the gesture —
    // iOS Safari rejects a resume that happens after an await.
    if (this.tone && !this.readyPromise) {
      this.readyPromise = this.start(this.tone);
    }
    if (!this.readyPromise) {
      this.readyPromise = this.loadTone()
        .then((tone) => this.start(tone))
        .catch((error: unknown) => this.fail(error));
    }
    return this.readyPromise;
  }

  private loadTone(): Promise<ToneModule> {
    if (!this.loadPromise) {
      this.loadPromise = import("tone").then((tone) => {
        this.tone = tone;
        return tone;
      });
      this.loadPromise.catch(() => {
        this.loadPromise = null;
      });
    }
    return this.loadPromise;
  }

  private start(tone: ToneModule): Promise<boolean> {
    const hasWebAudio =
      typeof window.AudioContext !== "undefined" ||
      typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !==
        "undefined";
    if (!hasWebAudio) {
      this.setStatus("unsupported");
      return Promise.resolve(false);
    }

    this.setStatus("loading");
    try {
      if (!this.voice) {
        // lookAhead 0 = notes start immediately; Tone's default (0.1s) suits
        // sequencing, not live playing.
        tone.setContext(new tone.Context({ latencyHint: "interactive", lookAhead: 0 }));
        this.buildGraph(tone);
      }
      return tone
        .start()
        .then(() => {
          this.setStatus("ready");
          this.flushPending();
          return true;
        })
        .catch((error: unknown) => this.fail(error));
    } catch (error) {
      return Promise.resolve(this.fail(error));
    }
  }

  private buildGraph(tone: ToneModule): void {
    this.master = new tone.Volume(this.volumeToDb(this.volume)).toDestination();
    this.master.mute = this.volume <= 0.001;
    const limiter = new tone.Limiter(-1).connect(this.master);
    const reverb = new tone.Reverb({ decay: 2.6, preDelay: 0.01, wet: 0.18 }).connect(limiter);

    // A filtered additive tone with a fast "hammer" filter sweep: warm,
    // piano-like and cheap enough for 32 simultaneous voices.
    this.voice = new tone.PolySynth(tone.MonoSynth, {
      volume: -11,
      oscillator: { type: "custom", partials: [1, 0.46, 0.2, 0.12, 0.06, 0.035, 0.02] },
      envelope: { attack: 0.003, decay: 2.2, sustain: 0.08, release: 0.9 },
      filter: { type: "lowpass", rolloff: -12, Q: 0.6 },
      filterEnvelope: {
        attack: 0.002,
        decay: 0.9,
        sustain: 0.3,
        release: 0.9,
        baseFrequency: 280,
        octaves: 4.4,
      },
    }).connect(reverb);
    this.voice.maxPolyphony = 32;
  }

  private fail(error: unknown): false {
    console.error("[MusicPath] Audio failed to start", error);
    this.readyPromise = null;
    this.setStatus("error");
    return false;
  }

  /** Releases every note when the page is hidden or loses focus (stuck-note guard). */
  private bindLifecycle(): void {
    if (this.lifecycleBound || typeof window === "undefined") return;
    this.lifecycleBound = true;
    const releaseEverything = () => this.releaseAll();
    window.addEventListener("blur", releaseEverything);
    window.addEventListener("pagehide", releaseEverything);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") releaseEverything();
    });
  }

  // ── Notes ───────────────────────────────────────────────────────────────────

  noteOn(midi: Midi, source: NoteSource, velocity = 0.8): void {
    let sources = this.held.get(midi);
    if (sources?.has(source)) return; // key-repeat or duplicate event
    if (!sources) {
      sources = new Set();
      this.held.set(midi, sources);
    }
    sources.add(source);

    if (sources.size === 1) {
      const v = clamp01(velocity);
      this.velocities.set(midi, v);
      if (this.voice && this.status === "ready") {
        this.voice.triggerAttack(midiToNoteName(midi), undefined, v);
      } else {
        this.pending.add(midi);
        void this.unlock();
      }
      this.updateSnapshot();
    }
    this.emit({ type: "on", midi, source, velocity });
  }

  noteOff(midi: Midi, source: NoteSource): void {
    const sources = this.held.get(midi);
    if (!sources?.has(source)) return;
    sources.delete(source);
    if (sources.size === 0) {
      this.held.delete(midi);
      // Pending notes stay queued so a tap before audio is ready still sounds.
      if (this.voice && !this.pending.has(midi)) {
        this.voice.triggerRelease(midiToNoteName(midi));
      }
      this.updateSnapshot();
    }
    this.emit({ type: "off", midi, source, velocity: 0 });
  }

  /** Releases every note held by sources starting with `prefix` (e.g. "pointer:", "midi:"). */
  releaseSource(prefix: string): void {
    for (const [midi, sources] of [...this.held]) {
      for (const source of [...sources]) {
        if (source.startsWith(prefix)) this.noteOff(midi, source);
      }
    }
  }

  releaseAll(): void {
    for (const [midi, sources] of [...this.held]) {
      for (const source of [...sources]) this.noteOff(midi, source);
    }
    this.voice?.releaseAll();
  }

  /** Plays notes as a short arpeggio/chord through the normal note path. */
  playPhrase(notes: readonly Midi[], { stagger = 0.09, hold = 1.1 } = {}): void {
    notes.forEach((midi, index) => {
      window.setTimeout(() => this.noteOn(midi, "demo", 0.7), index * stagger * 1000);
      window.setTimeout(
        () => this.noteOff(midi, "demo"),
        (index * stagger + hold) * 1000,
      );
    });
  }

  private flushPending(): void {
    if (!this.voice) return;
    for (const midi of this.pending) {
      const name = midiToNoteName(midi);
      const velocity = this.velocities.get(midi) ?? 0.8;
      if (this.held.has(midi)) this.voice.triggerAttack(name, undefined, velocity);
      else this.voice.triggerAttackRelease(name, 0.35, undefined, velocity);
    }
    this.pending.clear();
  }

  // ── Volume ──────────────────────────────────────────────────────────────────

  setVolume(volume: number): void {
    this.volume = clamp01(volume);
    if (!this.master) return;
    this.master.mute = this.volume <= 0.001;
    this.master.volume.rampTo(this.volumeToDb(this.volume), 0.05);
  }

  private volumeToDb(volume: number): number {
    // Perceptual curve: slider position squared ≈ loudness. Floor at -60 dB;
    // true silence is handled by `mute`.
    return Math.max(-60, 20 * Math.log10(Math.max(volume * volume, 1e-6)));
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private updateSnapshot(): void {
    this.activeSnapshot = Object.freeze([...this.held.keys()].sort((a, b) => a - b));
    this.activeListeners.forEach((listener) => listener());
  }

  private setStatus(status: AudioStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => listener());
  }

  private emit(event: NoteEvent): void {
    this.noteListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("[MusicPath] Note listener failed", error);
      }
    });
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export const audioEngine = new AudioEngine();
