"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Midi } from "@/lib/music/notes";
import { audioEngine, type AudioStatus, type NoteEvent } from "./engine";
import { midiBridge, type MidiState } from "./midi";

const NO_NOTES: readonly Midi[] = [];
const IDLE_MIDI: MidiState = { status: "idle", devices: [] };

export function useAudioStatus(): AudioStatus {
  return useSyncExternalStore(audioEngine.subscribeStatus, audioEngine.getStatus, () => "idle");
}

/** Notes currently held by any input source, sorted low → high. */
export function useActiveNotes(): readonly Midi[] {
  return useSyncExternalStore(
    audioEngine.subscribeActive,
    audioEngine.getActiveNotes,
    () => NO_NOTES,
  );
}

export function useMidiState(): MidiState {
  return useSyncExternalStore(midiBridge.subscribe, midiBridge.getState, () => IDLE_MIDI);
}

/** Calls `handler` for every note event from any source, without re-subscribing on each render. */
export function useNoteEvents(handler: (event: NoteEvent) => void): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => audioEngine.subscribeNotes((event) => handlerRef.current(event)), []);
}
