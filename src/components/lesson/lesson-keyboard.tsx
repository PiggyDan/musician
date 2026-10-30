"use client";

import { useRef } from "react";
import type { KeyboardRange } from "@/content/lessons/types";
import { useElementWidth } from "@/hooks/use-element-width";
import { MIDDLE_C, offsetWhiteKeys, type Midi } from "@/lib/music/notes";
import { PianoKeyboard, type KeyMark } from "@/components/piano/piano-keyboard";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";

const MIN_WHITE_KEY_PX = 36;

/**
 * The keyboard used inside lessons. With a `range` it shows that span (fewer
 * keys means bigger, comfier keys on phones); otherwise it fits as many keys as
 * the width allows around Middle C, with C4 near — not at — the center.
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

  let startMidi: Midi;
  let whiteKeyCount: number;
  if (range) {
    startMidi = range.start;
    whiteKeyCount = Math.min(range.whiteKeys, fit);
  } else {
    whiteKeyCount = Math.min(15, fit);
    startMidi = whiteKeyCount >= 15 ? 48 : offsetWhiteKeys(MIDDLE_C, -Math.floor(whiteKeyCount / 2));
  }

  useComputerKeyboard({ baseMidi: MIDDLE_C, enabled });

  return (
    <div ref={containerRef}>
      <PianoKeyboard
        startMidi={startMidi}
        whiteKeyCount={whiteKeyCount}
        showNoteNames={showNoteNames}
        keyHintBase={keyHints ? MIDDLE_C : null}
        highlight={highlight}
        marks={marks}
        size="lg"
      />
    </div>
  );
}
