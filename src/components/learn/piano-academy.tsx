"use client";

import { motion } from "motion/react";
import { ArrowRight, Clock3, RotateCcw } from "lucide-react";
import { getLessonState, PIANO_LESSONS, UNITS } from "@/content/lessons/piano";
import type { LessonState } from "@/content/lessons/types";
import { useProgressSummary } from "@/hooks/use-progress-summary";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { useStoresHydrated } from "@/store/hydration";
import { ButtonLink } from "@/components/ui/button";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { ProgressBar } from "@/components/ui/progress";
import { LessonNode } from "./lesson-node";
import { PageHeader } from "./page-header";

const TOTAL_XP = PIANO_LESSONS.reduce((sum, lesson) => sum + lesson.xp, 0);

export function PianoAcademy() {
  const { t, tag } = useI18n();
  const hydrated = useStoresHydrated();
  const { completedLessons, completedPiano, totalPiano } = useProgressSummary();
  const dateFormat = new Intl.DateTimeFormat(tag, { dateStyle: "medium" });

  const stateLabel: Record<LessonState, string> = {
    completed: t.common.completed,
    available: t.common.available,
    locked: t.common.locked,
    "coming-soon": t.common.comingSoon,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader eyebrow={t.academy.eyebrow} title={t.academy.title} subtitle={t.academy.subtitle}>
        <InstrumentGlyph id="piano" className="hidden size-20 text-pulse sm:block" />
      </PageHeader>

      <div className="glass mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl px-5 py-4">
        <span className="font-mono text-sm text-mist-200">{format(t.academy.lessonCount, { n: totalPiano })}</span>
        <span className="font-mono text-sm text-gold">{format(t.academy.xpTotal, { xp: TOTAL_XP })}</span>
        <div className="flex min-w-48 flex-1 items-center gap-3">
          <ProgressBar value={hydrated ? completedPiano / totalPiano : 0} label={t.academy.pathLabel} className="flex-1" />
          <span className="font-mono text-xs text-mist-400">
            {hydrated ? completedPiano : 0}/{totalPiano}
          </span>
        </div>
      </div>

      {UNITS.map((unit) => {
        const unitLessons = PIANO_LESSONS.filter((l) => l.unit === unit);
        const unitDone = unitLessons.filter((l) => completedLessons[l.id]).length;
        return (
          <section key={unit} className="mt-12" aria-labelledby={`unit-${unit}`}>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`unit-${unit}`} className="font-display text-xl font-medium sm:text-2xl">
                {t.academy.units[unit].title}
              </h2>
              <span className="font-mono text-xs text-mist-500">
                {hydrated ? unitDone : 0}/{unitLessons.length}
              </span>
            </div>
            <p className="-mt-4 mb-6 max-w-2xl text-sm text-mist-400">{t.academy.units[unit].subtitle}</p>
      <ol aria-label={t.academy.units[unit].title} className="relative">
        {unitLessons.map((lesson, index) => {
          const state: LessonState = hydrated ? getLessonState(lesson, completedLessons) : "locked";
          const copy = t.lessons[lesson.i18nKey];
          const completion = completedLessons[lesson.id];
          const href = `/learn/piano/lesson/${lesson.slug}`;

          return (
            <motion.li
              key={lesson.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.08 * index, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex gap-4 pb-6 last:pb-0 sm:gap-6"
            >
              {index < unitLessons.length - 1 && (
                <div
                  aria-hidden
                  className={cn(
                    "absolute top-8 -bottom-8 left-7 w-px sm:left-9",
                    state === "completed" ? "bg-gradient-to-b from-pulse to-ion" : "bg-white/10",
                  )}
                />
              )}
              <div className="relative z-10 pt-1 sm:px-2">
                <LessonNode state={state} order={lesson.order} />
              </div>

              <div
                className={cn(
                  "flex-1 rounded-3xl p-5 transition-colors sm:p-6",
                  state === "available" && "glass ring-1 ring-pulse/40",
                  state === "completed" && "bg-white/[0.035] ring-1 ring-white/[0.08]",
                  (state === "locked" || state === "coming-soon") && "bg-white/[0.015] ring-1 ring-white/[0.05]",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-xs text-mist-500">{format(t.common.lessonN, { n: lesson.order })}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase",
                      state === "completed" && "bg-success/10 text-success",
                      state === "available" && "bg-pulse/15 text-pulse",
                      state === "locked" && "bg-white/5 text-mist-500",
                      state === "coming-soon" && "bg-white/5 text-mist-400",
                    )}
                  >
                    {hydrated ? stateLabel[state] : t.common.loading}
                  </span>
                </div>
                <h2 className={cn("mt-2 text-lg font-medium sm:text-xl", state === "coming-soon" || state === "locked" ? "text-mist-200" : "text-mist-50")}>
                  {copy.title}
                </h2>
                <p className="mt-1 text-sm text-mist-400">{copy.summary}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-mist-500">
                    <Clock3 className="size-3.5" aria-hidden />
                    {format(t.common.minutes, { n: lesson.estimatedMinutes })}
                  </span>
                  <span className="font-mono text-xs text-gold/90">{format(t.academy.xpReward, { xp: lesson.xp })}</span>
                  {state === "completed" && completion && (
                    <span className="text-xs text-mist-500">
                      {format(t.academy.completedOn, { date: dateFormat.format(new Date(completion.completedAt)) })}
                    </span>
                  )}
                  <div className="ml-auto">
                    {state === "available" && (
                      <ButtonLink href={href} size="sm">
                        {t.academy.start}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </ButtonLink>
                    )}
                    {state === "completed" && (
                      <ButtonLink href={href} size="sm" variant="secondary">
                        <RotateCcw className="size-3.5" aria-hidden />
                        {t.academy.replay}
                      </ButtonLink>
                    )}
                  </div>
                </div>
                {state === "locked" && <p className="mt-3 text-xs text-mist-500">{t.academy.lockedHint}</p>}
                {state === "coming-soon" && <p className="mt-3 text-xs text-mist-500">{t.academy.comingSoonHint}</p>}
              </div>
            </motion.li>
          );
        })}
      </ol>
          </section>
        );
      })}
    </div>
  );
}
