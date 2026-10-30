"use client";

import { ArrowRight, Lightbulb } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { pitchClassName } from "@/lib/music/notes";
import { Button } from "@/components/ui/button";
import { StaffView } from "@/components/music/staff-view";
import { KeyPatternDiagram, RhythmDiagram } from "../key-pattern-diagram";
import type { StepProps } from "./shared";

function letter(midi: number): string {
  return pitchClassName(midi);
}

export function ExplainStep({ step, copy, onComplete, headingRef }: StepProps<"explain">) {
  const { t } = useI18n();
  const d = t.lesson.diagrams;

  const diagram =
    step.diagram === "key-pattern" ? (
      <KeyPatternDiagram label={copy.tip ?? copy.title} />
    ) : step.diagram === "letters" ? (
      <KeyPatternDiagram label={d.letters} variant="letters" />
    ) : step.diagram === "five-finger" ? (
      <KeyPatternDiagram label={d.fiveFinger} variant="five-finger" />
    ) : step.diagram === "rhythm" ? (
      <RhythmDiagram label={d.rhythm} quarter={d.quarter} half={d.half} beatLabel={d.beats} twoBeatsLabel={d.twoBeats} />
    ) : step.diagram === "left-hand" ? (
      <KeyPatternDiagram label={d.leftHand} variant="left-hand" />
    ) : step.diagram === "treble-staff" ? (
      <StaffView kind="treble" label={d.trebleStaff} groups={[60, 62, 64, 65, 67, 69, 71, 72].map((m) => ({ keys: [m], label: letter(m) }))} />
    ) : step.diagram === "bass-staff" ? (
      <StaffView kind="bass" label={d.bassStaff} groups={[48, 50, 52, 53, 55, 57, 59, 60].map((m) => ({ keys: [m], label: letter(m) }))} />
    ) : step.diagram === "triads" ? (
      <StaffView
        kind="treble"
        label={d.triads}
        groups={[
          { keys: [60, 64, 67], label: "C" },
          { keys: [65, 69, 72], label: "F" },
          { keys: [67, 71, 74], label: "G" },
        ]}
      />
    ) : step.diagram === "lh-chords" ? (
      <StaffView
        kind="bass"
        label={d.lhChords}
        groups={[
          { keys: [48, 52, 55], label: "C" },
          { keys: [48, 53, 57], label: "F" },
          { keys: [47, 50, 55], label: "G" },
          { keys: [48, 52, 55], label: "C" },
        ]}
      />
    ) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
      <div>
        {copy.eyebrow && <p className="eyebrow">{copy.eyebrow}</p>}
        <h1 ref={headingRef} tabIndex={-1} className="font-display mt-4 text-4xl font-medium tracking-tight outline-none sm:text-5xl">
          {copy.title}
        </h1>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-mist-200 sm:text-[17px]">
          {copy.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <Button size="lg" className="mt-8 max-sm:w-full" onClick={onComplete}>
          {copy.start ?? t.common.continue}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
      {(diagram || copy.tip) && (
        <aside className="glass flex flex-col items-center gap-6 self-start rounded-[28px] p-6 sm:p-8">
          {diagram}
          {copy.tip && (
            <div className="w-full">
              <p className="flex items-center gap-2 text-sm font-medium text-ion">
                <Lightbulb className="size-4" aria-hidden />
                {copy.tipTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-mist-400">{copy.tip}</p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
