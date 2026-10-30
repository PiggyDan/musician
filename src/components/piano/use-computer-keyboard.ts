"use client";

import { useEffect, useRef } from "react";
import { audioEngine } from "@/audio/engine";
import {
  KEY_CODE_TO_SEMITONE,
  OCTAVE_DOWN_CODE,
  OCTAVE_UP_CODE,
} from "@/lib/music/keyboard-map";
import { clampMidi, type Midi } from "@/lib/music/notes";

const SOURCE_PREFIX = "key:";

interface Options {
  /** MIDI note played by the "A" key. */
  baseMidi: Midi;
  enabled?: boolean;
  onOctaveShift?: (direction: -1 | 1) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !["range", "checkbox", "radio", "button"].includes(target.type);
  }
  return false;
}

/**
 * Plays the piano from the computer keyboard. Each physical key is its own note
 * source, and the note it started is remembered, so changing octave while a key
 * is held still releases the right note on key-up.
 */
export function useComputerKeyboard({ baseMidi, enabled = true, onOctaveShift }: Options): void {
  const baseRef = useRef(baseMidi);
  const shiftRef = useRef(onOctaveShift);
  useEffect(() => {
    baseRef.current = baseMidi;
    shiftRef.current = onOctaveShift;
  });

  useEffect(() => {
    if (!enabled) return;
    const pressed = new Map<string, Midi>();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;

      if (event.code === OCTAVE_DOWN_CODE || event.code === OCTAVE_UP_CODE) {
        event.preventDefault();
        if (!event.repeat) shiftRef.current?.(event.code === OCTAVE_UP_CODE ? 1 : -1);
        return;
      }

      const semitone = KEY_CODE_TO_SEMITONE[event.code];
      if (semitone === undefined) return;
      event.preventDefault();
      if (event.repeat || pressed.has(event.code)) return;

      const midi = clampMidi(baseRef.current + semitone);
      pressed.set(event.code, midi);
      audioEngine.noteOn(midi, SOURCE_PREFIX + event.code, 0.78);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const midi = pressed.get(event.code);
      if (midi === undefined) return;
      pressed.delete(event.code);
      audioEngine.noteOff(midi, SOURCE_PREFIX + event.code);
    };

    // Key-ups are lost when focus leaves the window, so release everything.
    const onBlur = () => {
      pressed.clear();
      audioEngine.releaseSource(SOURCE_PREFIX);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [enabled]);
}
