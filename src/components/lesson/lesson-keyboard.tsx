"use client";

import { useRef, useState } from "react";
import type { KeyboardRange } from "@/content/lessons/types";
import { useElementWidth } from "@/hooks/use-element-width";
import { MIDDLE_C, offsetWhiteKeys, type Midi } from "@/lib/music/notes";
import { PianoKeyboard, type KeyMark } from "@/components/piano/piano-keyboard";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";

const MIN_WHITE_KEY_PX = 36;

/**
 * The keyboard used inside lessons. With a `range` it shows that span (fewer
 * keys means bigger, comfier keys on phones; `fitAll` keeps every key for
 * two-hand work); otherwise it fits as many keys as the width allows around
 * Middle C, with C4 near — not at — the center. Z / X shift the computer
 * keyboard by an octave.
 */
export function LessonKeyboard({
  range,
  highlight,
  marks,
  showNoteNames = false,
  keyHints = false,
  enabled = true,
}: {
  range?: KeyboardRange;
  highlight?: readonly Midi[];
  marks?: Partial<Record<Midi, KeyMark>>;
  showNoteNames?: boolean;
  keyHints?: boolean;
  enabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef, 720);
  const fit = Math.max(8, Math.floor(width / MIN_WHITE_KEY_PX));
  // Where the computer keyboard's "A" key starts. With key hints on screen it
  // starts on the first visible key, so the whole span (17 semitones) is
  // reachable — e.g. F2–A3 for left-hand chords. Without hints it starts on a C,
  // keeping the familiar layout (A = C, W = C#, S = D …).
  const [base, setBase] = useState<Midi>(() => {
    if (!range) return MIDDLE_C;
    if (keyHints) return range.start;
    return range.start + ((12 - (range.start % 12)) % 12); // C at or above the first key
  });

  let startMidi: Midi;
  let whiteKeyCount: number;
  if (range) {
    startMidi = range.start;
    whiteKeyCount = range.fitAll ? range.whiteKeys : Math.min(range.whiteKeys, fit);
  } else {
    whiteKeyCount = Math.min(15, fit);
    startMidi = whiteKeyCount >= 15 ? 48 : offsetWhiteKeys(MIDDLE_C, -Math.floor(whiteKeyCount / 2));
  }

  useComputerKeyboard({
    baseMidi: base,
    enabled,
    onOctaveShift: (direction) => setBase((b) => Math.min(84, Math.max(24, b + direction * 12))),
  });

  return (
    <div ref={containerRef}>
      <PianoKeyboard
        startMidi={startMidi}
        whiteKeyCount={whiteKeyCount}
        showNoteNames={showNoteNames}
        keyHintBase={keyHints ? base : null}
        highlight={highlight}
        marks={marks}
        size="lg"
      />
    </div>
  );
}
