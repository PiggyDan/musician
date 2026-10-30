"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Clock3, Lock } from "lucide-react";
import Link from "next/link";
import { getLessonState, getPianoLesson } from "@/content/lessons/piano";
import { useI18n } from "@/i18n/use-i18n";
import { useStoresHydrated } from "@/store/hydration";
import { useProgressStore } from "@/store/progress";
import { ButtonLink } from "@/components/ui/button";
import { LessonRunner } from "./lesson-runner";

/** Resolves a lesson, checks it's unlocked, and renders the right lesson experience. */
export function LessonPlayer({ slug }: { slug: string }) {
  const { t } = useI18n();
  const hydrated = useStoresHydrated();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const lesson = getPianoLesson(slug);

  if (!lesson) return null; // the route already 404s for unknown slugs

  const state = getLessonState(lesson, completedLessons);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32">
      <Link
        href="/learn/piano"
        className="inline-flex items-center gap-2 rounded-full py-1 pr-3 text-sm text-mist-400 transition-colors hover:text-mist-50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t.lesson.backToAcademy}
      </Link>

      <AnimatePresence mode="wait">
        {!hydrated ? (
          <motion.div key="loading" exit={{ opacity: 0 }} className="mt-8 space-y-4" aria-busy>
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-12 w-2/3" />
            <div className="skeleton h-64 w-full rounded-3xl!" />
          </motion.div>
        ) : state === "locked" || state === "coming-soon" ? (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mx-auto mt-12 max-w-lg rounded-[28px] p-8 text-center"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/5 text-mist-400 ring-1 ring-white/10">
              {state === "locked" ? <Lock className="size-6" aria-hidden /> : <Clock3 className="size-6" aria-hidden />}
            </span>
            <h1 className="font-display mt-5 text-2xl font-medium">
              {state === "locked" ? t.lesson.unavailable.lockedTitle : t.lesson.unavailable.comingSoonTitle}
            </h1>
            <p className="mt-1 text-sm text-mist-200">{t.lessons[lesson.i18nKey].title}</p>
            <p className="mt-4 text-sm text-mist-400">
              {state === "locked" ? t.lesson.unavailable.lockedBody : t.lesson.unavailable.comingSoonBody}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/learn/piano" variant="secondary">
                {t.lesson.backToAcademy}
              </ButtonLink>
              <ButtonLink href="/practice" variant="ghost">
                {t.common.openStudio}
              </ButtonLink>
            </div>
          </motion.div>
        ) : (
          <motion.div key="lesson" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <LessonRunner lesson={lesson} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
