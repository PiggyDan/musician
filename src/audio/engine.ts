import type { Midi } from "@/lib/music/notes";
import { midiToNoteName } from "@/lib/music/notes";

type ToneModule = typeof import("tone");
type Voice = import("tone").PolySynth<import("tone").MonoSynth>;

export type AudioStatus = "idle" | "loading" | "ready" | "error" | "unsupported";

/** Which instrument sound plays a note. */
export type VoiceId = "piano" | "guitar" | "ukulele" | "violin" | "cello" | "harmonica";

interface VoiceImpl {
  attack(note: string, velocity: number): void;
  release(note: string): void;
  releaseAll(): void;
}

/**
 * Recorded instrument samples (FluidR3_GM soundfont, CC BY 3.0 — see
 * public/samples/LICENSE.txt), self-hosted in /public/samples/<dir>/. One file
 * every 3 semitones; Tone's Sampler pitch-shifts the nearest recording.
 * General MIDI has no ukulele, so it uses the nylon-string guitar recordings.
 */
const SAMPLE_SETS: Record<VoiceId, { dir: string; lo: number; hi: number; release: number; volume: number }> = {
  piano: { dir: "piano", lo: 24, hi: 108, release: 1.2, volume: -4 },
  guitar: { dir: "guitar", lo: 36, hi: 84, release: 0.9, volume: -2 },
  ukulele: { dir: "guitar", lo: 36, hi: 84, release: 0.6, volume: -2 },
  violin: { dir: "violin", lo: 54, hi: 99, release: 0.4, volume: -4 },
  cello: { dir: "cello", lo: 36, hi: 81, release: 0.5, volume: -2 },
  harmonica: { dir: "harmonica", lo: 60, hi: 96, release: 0.2, volume: -6 },
};
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function sampleUrls(lo: number, hi: number): Record<string, string> {
  const urls: Record<string, string> = {};
  for (let m = lo; m <= hi; m += 3) {
    const name = `${FLAT_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
    urls[name] = `${name}.mp3`;
  }
  return urls;
}

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
  private voices: Partial<Record<VoiceId, VoiceImpl>> = {};
  private samplers: Partial<Record<VoiceId, import("tone").Sampler>> = {};
  private wantedVoices = new Set<VoiceId>(["piano"]);
  private sampleOut: import("tone").ToneAudioNode | null = null;
  /** Which voice started each sounding note, so its release goes to the same voice. */
  private noteVoice = new Map<Midi, VoiceId>();
  private noteRelease = new Map<Midi, (note: string) => void>();
  private master: import("tone").Volume | null = null;
  private clicker: import("tone").Synth | null = null;
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
    // iOS 17+: the "playback" audio session plays even when the ring/silent
    // switch is set to silent. Older iOS ignores this (we show a hint instead).
    const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (audioSession) {
      try {
        audioSession.type = "playback";
      } catch {
        // Not supported — harmless.
      }
    }
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

    // Metronome: a short, dry woodblock-like tick that bypasses the reverb.
    this.clicker = new tone.Synth({
      volume: -8,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    }).connect(limiter);

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
    const piano = this.voice;
    this.voices.piano = {
      attack: (note, v) => piano.triggerAttack(note, undefined, v),
      release: (note) => piano.triggerRelease(note),
      releaseAll: () => piano.releaseAll(),
    };
    this.buildInstrumentVoices(tone, reverb);
    this.sampleOut = reverb;
    for (const voice of this.wantedVoices) this.loadSamples(voice);
  }

  /** Starts downloading an instrument's recordings (once audio is running). */
  preloadVoice(voice: VoiceId): void {
    this.wantedVoices.add(voice);
    if (this.tone && this.sampleOut) this.loadSamples(voice);
  }

  /** Resolves once an instrument's recordings are loaded (or after `timeoutMs`). */
  async waitForVoice(voice: VoiceId, timeoutMs = 4000): Promise<boolean> {
    this.preloadVoice(voice);
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      if (this.samplers[voice]?.loaded) return true;
      await new Promise((r) => window.setTimeout(r, 50));
    }
    return false;
  }

  private loadSamples(voice: VoiceId): void {
    if (!this.tone || !this.sampleOut || this.samplers[voice]) return;
    const set = SAMPLE_SETS[voice];
    this.samplers[voice] = new this.tone.Sampler({
      urls: sampleUrls(set.lo, set.hi),
      baseUrl: `/samples/${set.dir}/`,
      release: set.release,
      volume: set.volume,
      onerror: (error) => console.error(`[MusicPath] ${voice} samples failed to load`, error),
    }).connect(this.sampleOut);
  }

  /** The recorded instrument if its samples are loaded; otherwise the synth stand-in. */
  private play(voice: VoiceId): { attack: (note: string, v: number) => void; release: (note: string) => void } {
    const sampler = this.samplers[voice];
    if (sampler?.loaded) {
      return { attack: (note, v) => sampler.triggerAttack(note, undefined, v), release: (note) => sampler.triggerRelease(note) };
    }
    if (!sampler) this.preloadVoice(voice);
    return this.voices[voice] ?? this.voices.piano!;
  }

  /**
   * Synthesized instrument voices (no samples, so no licensing questions):
   * plucked strings use Karplus-Strong physical modelling; bowed strings and
   * harmonica use shaped oscillators with a slow attack and vibrato.
   */
  private buildInstrumentVoices(tone: ToneModule, out: import("tone").ToneAudioNode): void {
    const pluckPool = (options: { attackNoise: number; dampening: number; resonance: number; volume: number }): VoiceImpl => {
      const filter = new tone.Filter(5200, "lowpass").connect(out);
      const pool = Array.from({ length: 10 }, () => new tone.PluckSynth({ ...options }).connect(filter));
      const byNote = new Map<string, (typeof pool)[number]>();
      let next = 0;
      return {
        attack: (note) => {
          const synth = pool[next];
          next = (next + 1) % pool.length;
          byNote.set(note, synth);
          synth.triggerAttack(note);
        },
        // Lifting a finger damps the string.
        release: (note) => {
          byNote.get(note)?.triggerRelease();
          byNote.delete(note);
        },
        releaseAll: () => {
          pool.forEach((s) => s.triggerRelease());
          byNote.clear();
        },
      };
    };
    const poly = (synth: Voice | import("tone").PolySynth): VoiceImpl => ({
      attack: (note, v) => synth.triggerAttack(note, undefined, v),
      release: (note) => synth.triggerRelease(note),
      releaseAll: () => synth.releaseAll(),
    });
    const bowed = (brightness: number, attack: number, vibratoHz: number) => {
      const vibrato = new tone.Vibrato(vibratoHz, 0.09).connect(out);
      const synth = new tone.PolySynth(tone.MonoSynth, {
        volume: -15,
        oscillator: { type: "sawtooth" },
        envelope: { attack, decay: 0.25, sustain: 0.85, release: 0.35 },
        filter: { type: "lowpass", rolloff: -24, Q: 1.2 },
        filterEnvelope: { attack: attack * 1.4, decay: 0.4, sustain: 0.7, release: 0.35, baseFrequency: brightness, octaves: 2.2 },
      }).connect(vibrato);
      synth.maxPolyphony = 8;
      return poly(synth);
    };

    this.voices.guitar = pluckPool({ attackNoise: 1.4, dampening: 3600, resonance: 0.97, volume: -2 });
    this.voices.ukulele = pluckPool({ attackNoise: 0.9, dampening: 5600, resonance: 0.93, volume: -2 });
    this.voices.violin = bowed(950, 0.08, 5.6);
    this.voices.cello = bowed(320, 0.12, 4.8);

    const reedVibrato = new tone.Vibrato(6, 0.05).connect(out);
    const reedFilter = new tone.Filter(2300, "lowpass").connect(reedVibrato);
    const harmonica = new tone.PolySynth(tone.Synth, {
      volume: -20,
      oscillator: { type: "square" },
      envelope: { attack: 0.035, decay: 0.12, sustain: 0.8, release: 0.12 },
    }).connect(reedFilter);
    harmonica.maxPolyphony = 6;
    this.voices.harmonica = poly(harmonica);
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

  noteOn(midi: Midi, source: NoteSource, velocity = 0.8, voice: VoiceId = "piano"): void {
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
      this.noteVoice.set(midi, voice);
      if (this.voice && this.status === "ready") {
        const player = this.play(voice);
        this.noteRelease.set(midi, player.release);
        player.attack(midiToNoteName(midi), v);
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
        this.noteRelease.get(midi)?.(midiToNoteName(midi));
      }
      this.noteVoice.delete(midi);
      this.noteRelease.delete(midi);
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
    for (const voice of Object.values(this.voices)) voice.releaseAll();
    for (const sampler of Object.values(this.samplers)) sampler.releaseAll();
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

  /**
   * Plays notes at given offsets (seconds from now) through the normal note
   * path, so keys light up. Returns a function that cancels what hasn't played.
   */
  playTimed(notes: readonly { midi: Midi; at: number; duration: number }[], voice: VoiceId = "piano"): () => void {
    const timers: number[] = [];
    for (const note of notes) {
      timers.push(window.setTimeout(() => this.noteOn(note.midi, "demo", 0.7, voice), note.at * 1000));
      timers.push(
        window.setTimeout(() => this.noteOff(note.midi, "demo"), (note.at + note.duration) * 1000),
      );
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      this.releaseSource("demo");
    };
  }

  // ── Audio clock (metronome) ─────────────────────────────────────────────────

  /** Current AudioContext time in seconds, or null before audio is running. */
  audioTime(): number | null {
    if (!this.tone || this.status !== "ready") return null;
    return this.tone.getContext().currentTime;
  }

  /** How long after scheduling a sound actually leaves the speakers. */
  outputLatencySec(): number {
    if (!this.tone || this.status !== "ready") return 0;
    const raw = this.tone.getContext().rawContext as AudioContext;
    return (raw.outputLatency || 0) + (raw.baseLatency || 0);
  }

  /** Schedules a metronome tick at an AudioContext time. */
  click(time: number, accent: boolean): void {
    this.clicker?.triggerAttackRelease(accent ? 1760 : 1175, 0.03, time, accent ? 0.9 : 0.55);
  }

  private flushPending(): void {
    if (!this.voice) return;
    for (const midi of this.pending) {
      const name = midiToNoteName(midi);
      const velocity = this.velocities.get(midi) ?? 0.8;
      const voice = this.play(this.noteVoice.get(midi) ?? "piano");
      this.noteRelease.set(midi, voice.release);
      voice.attack(name, velocity);
      if (!this.held.has(midi)) window.setTimeout(() => voice.release(name), 350);
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
