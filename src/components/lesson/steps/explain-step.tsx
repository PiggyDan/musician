"use client";

import { ArrowRight, Lightbulb } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import { KeyPatternDiagram, RhythmDiagram } from "../key-pattern-diagram";
import type { StepProps } from "./shared";

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
