"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { LessonStep, LessonStepKind } from "@/content/lessons/types";
import type { StepCopy } from "@/i18n/types";
import type { Midi } from "@/lib/music/notes";
import type { KeyMark } from "@/components/piano/piano-keyboard";

export interface StepProps<K extends LessonStepKind> {
  step: Extract<LessonStep, { kind: K }>;
  copy: StepCopy;
  /** Call once when the learner has passed this step. */
  onComplete: () => void;
  /** Focuses the step heading after the learner navigates (screen readers). */
  headingRef: (el: HTMLHeadingElement | null) => void;
}

/**
 * Runs `fn` once, `ms` after `active` becomes true. Effect-driven rather than a
 * bare timer so that if the route is hidden (React <Activity>) and shown again,
 * the pending action still happens.
 */
export function useAfter(active: boolean, ms: number, fn: () => void): void {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => fnRef.current(), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
}

const MARK_MS = 650;

/** Short-lived correct/wrong colors on piano keys. */
export function useFlashMarks(): [Partial<Record<Midi, KeyMark>>, (midi: Midi, mark: KeyMark, sticky?: boolean) => void] {
  const [state, setState] = useState<{ marks: Partial<Record<Midi, KeyMark>>; id: number; sticky: boolean }>({
    marks: {},
    id: 0,
    sticky: false,
  });
  const flash = useCallback((midi: Midi, mark: KeyMark, sticky = false) => {
    setState((s) => ({ marks: { [midi]: mark }, id: s.id + 1, sticky }));
  }, []);
  const hasMarks = Object.keys(state.marks).length > 0 && !state.sticky;
  const currentId = state.id;
  useAfter(hasMarks, MARK_MS, () => {
    setState((s) => (s.id === currentId ? { ...s, marks: {} } : s));
  });
  return [state.marks, flash];
}

export function StepHeader({
  copy,
  headingRef,
  aside,
}: {
  copy: StepCopy;
  headingRef: (el: HTMLHeadingElement | null) => void;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-xl">
        {copy.eyebrow && <p className="eyebrow mb-3">{copy.eyebrow}</p>}
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-medium tracking-tight outline-none sm:text-4xl">
          {copy.title}
        </h1>
        {copy.prompt && <p className="mt-3 text-mist-200 sm:text-lg">{copy.prompt}</p>}
        {copy.inputs && <p className="mt-2 text-sm text-mist-500">{copy.inputs}</p>}
      </div>
      {aside && <div className="flex flex-wrap items-center gap-3">{aside}</div>}
    </div>
  );
}
