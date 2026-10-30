"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { audioEngine } from "@/audio/engine";
import { useActiveNotes, useNoteEvents } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { SEMITONE_TO_KEY_LABEL } from "@/lib/music/keyboard-map";
import {
  buildKeyboard,
  MIDDLE_C,
  pitchClass,
  pitchClassName,
  octaveOf,
  type Midi,
} from "@/lib/music/notes";
import { cn } from "@/lib/cn";

export type KeyMark = "correct" | "wrong";

export interface PianoKeyboardProps {
  /** First (white) key. */
  startMidi: Midi;
  whiteKeyCount: number;
  showNoteNames?: boolean;
  /** MIDI note mapped to the "A" key; shows computer-key hints when set. */
  keyHintBase?: Midi | null;
  /** Keys that pulse to draw attention (e.g. a lesson target). */
  highlight?: readonly Midi[];
  /** Short-lived feedback colors on keys. */
  marks?: Partial<Record<Midi, KeyMark>>;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Black keys sit slightly off-center on a real piano; offsets are fractions of a white key. */
const BLACK_KEY_OFFSET: Record<number, number> = { 1: -0.1, 3: 0.1, 6: -0.12, 8: 0, 10: 0.12 };
const BLACK_KEY_WIDTH = 0.6;
const MAX_PARTICLES = 24;

const HEIGHTS = {
  sm: "h-32 sm:h-36",
  md: "h-40 sm:h-52",
  lg: "h-44 sm:h-60 lg:h-64",
} as const;

interface Particle {
  id: number;
  midi: Midi;
}

let particleId = 0;

export function PianoKeyboard({
  startMidi,
  whiteKeyCount,
  showNoteNames = true,
  keyHintBase = null,
  highlight = [],
  marks = {},
  size = "md",
  className,
}: PianoKeyboardProps) {
  const { t } = useI18n();
  const instanceId = useId();
  const pointerPrefix = `pointer:${instanceId}:`;
  const focusSource = `focus:${instanceId}`;

  const keys = useMemo(() => buildKeyboard(startMidi, whiteKeyCount), [startMidi, whiteKeyCount]);
  const midiSet = useMemo(() => new Set(keys.map((k) => k.midi)), [keys]);
  const activeNotes = useActiveNotes();
  const active = useMemo(() => new Set(activeNotes), [activeNotes]);
  const highlighted = useMemo(() => new Set(highlight), [highlight]);

  const pointers = useRef(new Map<number, Midi>());
  const keyRefs = useRef(new Map<Midi, HTMLButtonElement>());
  const [focusMidi, setFocusMidi] = useState<Midi>(() =>
    midiSet.has(MIDDLE_C) ? MIDDLE_C : keys[0]?.midi ?? startMidi,
  );
  const [particles, setParticles] = useState<Particle[]>([]);

  // Keep the roving focus target on a visible key when the range changes.
  const tabbableMidi = midiSet.has(focusMidi) ? focusMidi : (keys[0]?.midi ?? startMidi);

  // Never leave notes hanging when this keyboard unmounts or is hidden.
  useEffect(() => {
    const map = pointers.current;
    return () => {
      map.clear();
      audioEngine.releaseSource(pointerPrefix);
      audioEngine.releaseSource(focusSource);
    };
  }, [pointerPrefix, focusSource]);

  // A light particle rises from any key that starts sounding, whatever the input.
  useNoteEvents((event) => {
    if (event.type !== "on" || !midiSet.has(event.midi)) return;
    const id = ++particleId;
    setParticles((list) => [...list.slice(-(MAX_PARTICLES - 1)), { id, midi: event.midi }]);
  });

  const removeParticle = useCallback((id: number) => {
    setParticles((list) => list.filter((p) => p.id !== id));
  }, []);

  // ── Pointer input (mouse, pen, multi-touch, glissando) ──────────────────────

  const keyAt = (clientX: number, clientY: number): { midi: Midi; el: HTMLElement } | null => {
    const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("[data-midi]");
    if (!el || !el.closest(`[data-piano="${CSS.escape(instanceId)}"]`)) return null;
    return { midi: Number(el.dataset.midi), el };
  };

  const velocityFor = (el: HTMLElement, clientY: number): number => {
    const rect = el.getBoundingClientRect();
    const depth = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
    return 0.5 + 0.45 * Math.min(1, Math.max(0, depth));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const hit = keyAt(event.clientX, event.clientY);
    if (!hit) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, hit.midi);
    audioEngine.noteOn(hit.midi, pointerPrefix + event.pointerId, velocityFor(hit.el, event.clientY));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = pointers.current.get(event.pointerId);
    if (current === undefined) return;
    const hit = keyAt(event.clientX, event.clientY);
    const next = hit?.midi ?? null;
    if (next === current) return;
    const source = pointerPrefix + event.pointerId;
    audioEngine.noteOff(current, source);
    if (hit) {
      pointers.current.set(event.pointerId, hit.midi);
      audioEngine.noteOn(hit.midi, source, velocityFor(hit.el, event.clientY));
    } else {
      // Slid off the keyboard: keep tracking so sliding back in plays again.
      pointers.current.set(event.pointerId, Number.NaN);
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = pointers.current.get(event.pointerId);
    if (current === undefined) return;
    pointers.current.delete(event.pointerId);
    if (!Number.isNaN(current)) audioEngine.noteOff(current, pointerPrefix + event.pointerId);
  };

  // ── Keyboard focus input (accessibility) ────────────────────────────────────

  const moveFocus = (midi: Midi) => {
    if (!midiSet.has(midi)) return;
    setFocusMidi(midi);
    keyRefs.current.get(midi)?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, midi: Midi) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        moveFocus(midi + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(midi - 1);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(keys[0].midi);
        break;
      case "End":
        event.preventDefault();
        moveFocus(keys[keys.length - 1].midi);
        break;
      case " ":
      case "Enter":
        event.preventDefault();
        if (!event.repeat) audioEngine.noteOn(midi, focusSource);
        break;
    }
  };

  const onKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>, midi: Midi) => {
    if (event.key === " " || event.key === "Enter") audioEngine.noteOff(midi, focusSource);
  };

  // ── Layout ──────────────────────────────────────────────────────────────────

  const whiteWidth = 100 / whiteKeyCount;
  const first = keys[0];
  const last = keys[keys.length - 1];

  const leftFor = (midi: Midi, whiteIndex: number, black: boolean): number => {
    if (!black) return whiteIndex * whiteWidth;
    const offset = BLACK_KEY_OFFSET[pitchClass(midi)] ?? 0;
    return (whiteIndex + 1 + offset - BLACK_KEY_WIDTH / 2) * whiteWidth;
  };

  return (
    <div
      className={cn(
        "relative select-none rounded-[22px] p-2 pt-3 sm:p-3 sm:pt-4",
        "bg-[linear-gradient(180deg,#1b1b2e,#0c0c16)] shadow-[0_30px_80px_-30px_rgba(106,85,255,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10",
        className,
      )}
    >
      {/* Felt strip above the keys, lit by the brand spectrum. */}
      <div aria-hidden className="bg-spectrum absolute inset-x-6 top-1.5 h-px opacity-70 sm:top-2" />

      <div
        role="group"
        aria-label={format(t.piano.keyboardLabel, { from: first?.name ?? "", to: last?.name ?? "" })}
        aria-describedby={`${instanceId}-usage`}
        data-piano={instanceId}
        className={cn("relative w-full touch-none", HEIGHTS[size])}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onContextMenu={(event) => event.preventDefault()}
      >
        <p id={`${instanceId}-usage`} className="sr-only">
          {t.piano.usage}
        </p>

        {/* Particles live above the keys, outside the clipping of the key bed. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0">
          {particles.map((particle) => {
            const key = keys.find((k) => k.midi === particle.midi);
            if (!key) return null;
            const center =
              leftFor(key.midi, key.whiteIndex, key.isBlack) +
              (key.isBlack ? (BLACK_KEY_WIDTH * whiteWidth) / 2 : whiteWidth / 2);
            const hue = 250 - pitchClass(particle.midi) * 6;
            return (
              <span
                key={particle.id}
                onAnimationEnd={() => removeParticle(particle.id)}
                className="animate-note-rise absolute top-0 size-2.5 rounded-full"
                style={{
                  left: `${center}%`,
                  background: `hsl(${hue} 95% 72%)`,
                  boxShadow: `0 0 14px 4px hsl(${hue} 95% 65% / 0.7)`,
                }}
              />
            );
          })}
        </div>

        {keys.map((key) => {
          const isActive = active.has(key.midi);
          const isTarget = highlighted.has(key.midi);
          const mark = marks[key.midi];
          const semitone = keyHintBase === null ? undefined : key.midi - keyHintBase;
          const hint = semitone === undefined ? undefined : SEMITONE_TO_KEY_LABEL[semitone];
          const isC = pitchClass(key.midi) === 0;

          return (
            <button
              key={key.midi}
              ref={(el) => {
                if (el) keyRefs.current.set(key.midi, el);
                else keyRefs.current.delete(key.midi);
              }}
              type="button"
              data-midi={key.midi}
              data-active={isActive}
              data-mark={mark}
              aria-label={key.name}
              aria-pressed={isActive}
              tabIndex={key.midi === tabbableMidi ? 0 : -1}
              onKeyDown={(event) => onKeyDown(event, key.midi)}
              onKeyUp={(event) => onKeyUp(event, key.midi)}
              onBlur={() => audioEngine.noteOff(key.midi, focusSource)}
              onFocus={() => setFocusMidi(key.midi)}
              className={cn(
                "absolute top-0 flex flex-col items-center justify-end outline-offset-[-3px] focus-visible:outline-2",
                key.isBlack
                  ? "piano-black z-20 h-[62%] rounded-b-[7px] pb-2"
                  : "piano-white z-10 h-full rounded-b-[10px] pb-2.5 sm:pb-3",
                isTarget && "piano-target",
              )}
              style={{
                left: `calc(${leftFor(key.midi, key.whiteIndex, key.isBlack)}% + ${key.isBlack ? 0 : 1.5}px)`,
                width: key.isBlack
                  ? `${BLACK_KEY_WIDTH * whiteWidth}%`
                  : `calc(${whiteWidth}% - 3px)`,
              }}
            >
              {hint && (
                <span
                  aria-hidden
                  className={cn(
                    "mb-1.5 hidden rounded-[5px] px-1 font-mono text-[10px] leading-4 font-medium md:block",
                    key.isBlack ? "bg-white/10 text-mist-200" : "bg-ink-900/[0.07] text-ink-600",
                  )}
                >
                  {hint}
                </span>
              )}
              {showNoteNames && !key.isBlack && (
                <span
                  aria-hidden
                  className={cn(
                    "font-mono text-[10px] leading-none sm:text-[11px]",
                    isC ? "font-semibold text-pulse-deep" : "text-ink-500/70",
                  )}
                >
                  {isC ? `C${octaveOf(key.midi)}` : pitchClassName(key.midi)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
