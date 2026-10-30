"use client";

import { motion } from "motion/react";
import { ArrowRight, Check, GraduationCap, Music2, RotateCcw, Sparkles } from "lucide-react";
import { getNextLesson } from "@/content/lessons/piano";
import type { LessonDefinition } from "@/content/lessons/types";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { getLevelInfo } from "@/lib/gamification/levels";
import { cn } from "@/lib/cn";
import { useProgressStore } from "@/store/progress";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import type { LessonResult } from "./lesson-runner";

export function LessonComplete({
  lesson,
  result,
  headingRef,
  onReplay,
}: {
  lesson: LessonDefinition;
  result: LessonResult;
  headingRef: (el: HTMLHeadingElement | null) => void;
  onReplay: () => void;
}) {
  const { t } = useI18n();
  const c = t.lesson.complete;
  const totalXp = useProgressStore((s) => s.xp);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const levelInfo = getLevelInfo(totalXp);
  const next = getNextLesson(completedLessons);
  const course = Boolean(lesson.completesCourse);

  return (
    <section className="relative mx-auto mt-10 max-w-xl overflow-hidden rounded-[32px] p-8 text-center ring-1 ring-white/10 sm:p-10">
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10",
          course
            ? "bg-[radial-gradient(70%_60%_at_50%_0%,rgba(255,207,115,0.22),transparent_70%),radial-gradient(90%_80%_at_50%_100%,rgba(106,85,255,0.3),transparent_70%),#0c0c18]"
            : "bg-[radial-gradient(70%_60%_at_50%_0%,rgba(79,224,168,0.18),transparent_70%),radial-gradient(90%_80%_at_50%_100%,rgba(106,85,255,0.25),transparent_70%),#0c0c18]",
        )}
      />
      <Burst count={course ? 24 : 14} gold={course} />
      <motion.span
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className={cn(
          "relative mx-auto flex size-20 items-center justify-center rounded-full text-ink-950",
          course ? "bg-gold shadow-[0_0_60px_-4px_rgba(255,207,115,0.8)]" : "bg-success shadow-[0_0_60px_-4px_rgba(79,224,168,0.8)]",
        )}
      >
        {course ? <GraduationCap className="size-10" aria-hidden /> : <Check className="size-10" strokeWidth={3} aria-hidden />}
      </motion.span>

      {course && (
        <p className="mt-6 inline-flex rounded-full bg-gold/10 px-3 py-1 font-mono text-[11px] tracking-wider text-gold uppercase ring-1 ring-gold/30">
          {c.courseBadge}
        </p>
      )}
      <h1 ref={headingRef} tabIndex={-1} className={cn("font-display text-3xl font-medium outline-none sm:text-4xl", course ? "mt-4" : "mt-7")}>
        {course ? c.courseTitle : c.title}
      </h1>
      <p className="mt-3 text-mist-200">{course ? c.courseBody : t.lessons[lesson.i18nKey].done}</p>

      <div className="mt-7" role="status">
        {result.alreadyCompleted ? (
          <p className="mx-auto max-w-sm rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-mist-400 ring-1 ring-white/[0.08]">
            {c.alreadyEarned}
          </p>
        ) : (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-5 py-2.5 font-mono text-lg font-medium text-gold ring-1 ring-gold/30"
          >
            <Sparkles className="size-5" aria-hidden />
            {format(c.xpEarned, { xp: result.xpAwarded })}
          </motion.p>
        )}
      </div>

      <div className="mx-auto mt-6 max-w-xs">
        <ProgressBar value={levelInfo.progress} label={t.common.level} />
        <p className="mt-2 font-mono text-xs text-mist-400">
          {format(c.levelProgress, { level: levelInfo.level, xp: totalXp })}
        </p>
      </div>

      <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
        {next && next.id !== lesson.id ? (
          <ButtonLink href={`/learn/piano/lesson/${next.slug}`} className="max-sm:w-full">
            {c.nextLesson}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        ) : (
          <ButtonLink href="/learn/piano" className="max-sm:w-full">
            {c.backToAcademy}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        )}
        <ButtonLink href="/practice" variant="secondary" className="max-sm:w-full">
          <Music2 className="size-4" aria-hidden />
          {c.openStudio}
        </ButtonLink>
        <Button variant="ghost" onClick={onReplay}>
          <RotateCcw className="size-4" aria-hidden />
          {c.replay}
        </Button>
      </div>
    </section>
  );
}

/** A one-shot ring of sparks behind the success badge. */
function Burst({ count, gold }: { count: number; gold: boolean }) {
  const colors = gold ? ["#ffcf73", "#8b7bff", "#2fd8ee"] : ["#2fd8ee", "#8b7bff"];
  return (
    <div aria-hidden className="pointer-events-none absolute top-[4.5rem] left-1/2 sm:top-[5.25rem]">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const distance = gold ? 140 + (i % 3) * 30 : 110;
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, opacity: 0, scale: 0.4 }}
            transition={{ duration: gold ? 1.6 : 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        );
      })}
    </div>
  );
}
