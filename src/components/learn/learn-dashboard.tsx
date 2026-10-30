"use client";

import { ArrowRight, FlaskConical, Music2, PartyPopper } from "lucide-react";
import Link from "next/link";
import { INSTRUMENTS } from "@/content/instruments";
import { getLessonState, getNextLesson, PIANO_LESSONS } from "@/content/lessons/piano";
import { useProgressSummary } from "@/hooks/use-progress-summary";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { useStoresHydrated } from "@/store/hydration";
import { useProgressStore } from "@/store/progress";
import { ButtonLink } from "@/components/ui/button";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { LevelRing, ProgressBar } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { LessonNode } from "./lesson-node";
import { PageHeader } from "./page-header";

export function LearnDashboard() {
  const { t } = useI18n();
  const hydrated = useStoresHydrated();
  const { xp, completedLessons, completedPiano, totalPiano, levelInfo } = useProgressSummary();
  const currentInstrument = useProgressStore((s) => s.currentInstrument);
  const next = getNextLesson(completedLessons);
  const isNew = hydrated && completedPiano === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader
        eyebrow={t.learn.eyebrow}
        title={hydrated ? (isNew ? t.learn.titleNew : t.learn.title) : t.learn.titleNew}
        subtitle={t.learn.subtitle}
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Continue learning */}
        <Reveal>
          <div className="relative h-full overflow-hidden rounded-[28px] p-6 ring-1 ring-white/10 sm:p-8">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(106,85,255,0.32),transparent_60%),linear-gradient(170deg,#15152a,#0b0b15)]"
            />
            {!hydrated ? (
              <div className="space-y-4" aria-busy>
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-9 w-2/3" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton mt-8 h-11 w-40 rounded-full!" />
              </div>
            ) : next ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <p className="eyebrow">{t.learn.continueEyebrow}</p>
                  <span className="font-mono text-xs text-mist-500">
                    {format(t.common.lessonN, { n: next.order })} · {format(t.common.minutes, { n: next.estimatedMinutes })}
                  </span>
                </div>
                <h2 className="font-display mt-4 text-3xl leading-tight font-medium sm:text-4xl">
                  {t.lessons[next.i18nKey].title}
                </h2>
                <p className="mt-3 max-w-md text-mist-400">{t.lessons[next.i18nKey].summary}</p>
                <div className="mt-8 flex flex-wrap items-center gap-4 pt-2 lg:mt-auto">
                  <ButtonLink href={`/learn/piano/lesson/${next.slug}`} size="lg">
                    {completedPiano === 0 ? t.learn.startCta : t.learn.continueCta}
                    <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                  <span className="font-mono text-sm text-gold">{format(t.academy.xpReward, { xp: next.xp })}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <PartyPopper className="size-8 text-gold" aria-hidden />
                <h2 className="font-display mt-4 text-3xl font-medium">{t.learn.allCaughtUpTitle}</h2>
                <p className="mt-3 max-w-md text-mist-400">{t.learn.allCaughtUpBody}</p>
                <div className="mt-8 lg:mt-auto">
                  <ButtonLink href="/practice" variant="secondary">
                    <Music2 className="size-4" aria-hidden />
                    {t.learn.practiceCta}
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        {/* Level & stats */}
        <Reveal delay={0.08}>
          <div className="glass flex h-full flex-col gap-6 rounded-[28px] p-6 sm:p-7">
            <div className="flex items-center gap-5">
              {hydrated ? (
                <LevelRing level={levelInfo.level} progress={levelInfo.progress} label={t.common.level} />
              ) : (
                <div className="skeleton size-28 rounded-full!" />
              )}
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-mist-400">{t.learn.statsXp}</p>
                <p className="font-display text-3xl font-medium text-gold">{hydrated ? xp : "–"}</p>
                {hydrated && (
                  <p className="text-xs text-mist-500">
                    {format(t.learn.toNextLevel, { xp: levelInfo.xpToNext, level: levelInfo.level + 1 })}
                  </p>
                )}
              </div>
            </div>
            <ProgressBar value={hydrated ? levelInfo.progress : 0} label={t.common.level} />
            <dl className="grid grid-cols-2 gap-3">
              <div className="flex flex-col-reverse rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <dt className="mt-1 text-xs text-mist-400">{t.learn.statsLessons}</dt>
                <dd className="font-display text-2xl font-medium">
                  {hydrated ? completedPiano : "–"}
                  <span className="text-base text-mist-500">/{totalPiano}</span>
                </dd>
              </div>
              <div className="flex flex-col-reverse rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
                <dt className="mt-1 text-xs text-mist-400">{t.learn.currentInstrument}</dt>
                <dd className="flex items-center gap-2 text-base font-medium">
                  <InstrumentGlyph id={currentInstrument} className="size-6 text-pulse" />
                  {t.instruments[currentInstrument].name}
                </dd>
              </div>
            </dl>
          </div>
        </Reveal>
      </div>

      {/* Journey */}
      <Reveal delay={0.1} className="mt-4">
        <section className="glass rounded-[28px] p-6 sm:p-8" aria-labelledby="journey-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="journey-title" className="font-display text-xl font-medium sm:text-2xl">
                {t.learn.journeyTitle}
              </h2>
              <p className="mt-1 text-sm text-mist-400">
                {format(t.learn.journeySubtitle, { done: hydrated ? completedPiano : 0, total: totalPiano })}
              </p>
            </div>
            <Link href="/learn/piano" className="inline-flex items-center gap-1.5 text-sm font-medium text-ion hover:underline">
              {t.learn.viewCourse}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <ol className="relative mt-8 grid grid-cols-5 gap-2">
            <div aria-hidden className="absolute top-7 right-[10%] left-[10%] h-px bg-white/10" />
            <div
              aria-hidden
              className="bg-spectrum absolute top-7 left-[10%] h-px transition-[width] duration-1000"
              style={{ width: `${(Math.min(hydrated ? completedPiano : 0, totalPiano - 1) / (totalPiano - 1)) * 80}%` }}
            />
            {PIANO_LESSONS.map((lesson) => {
              const state = hydrated ? getLessonState(lesson, completedLessons) : "locked";
              const playable = state === "available" || state === "completed";
              const content = (
                <>
                  <LessonNode state={state} order={lesson.order} />
                  <span
                    className={cn(
                      "mt-3 line-clamp-2 text-center text-[11px] leading-tight sm:text-sm",
                      playable ? "text-mist-50" : "text-mist-500",
                    )}
                  >
                    {t.lessons[lesson.i18nKey].title}
                  </span>
                  <span className="sr-only">
                    {state === "completed"
                      ? t.common.completed
                      : state === "available"
                        ? t.common.available
                        : state === "locked"
                          ? t.common.locked
                          : t.common.comingSoon}
                  </span>
                </>
              );
              return (
                <li key={lesson.id} className="relative flex justify-center">
                  {playable ? (
                    <Link href={`/learn/piano/lesson/${lesson.slug}`} className="flex flex-col items-center rounded-2xl p-1">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center p-1">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Instruments */}
        <Reveal delay={0.12}>
          <section className="glass h-full rounded-[28px] p-6 sm:p-8" aria-labelledby="instruments-title">
            <h2 id="instruments-title" className="font-display text-xl font-medium">
              {t.learn.instrumentsTitle}
            </h2>
            <p className="mt-1 text-sm text-mist-400">{t.learn.instrumentsSubtitle}</p>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {INSTRUMENTS.map((instrument) => {
                const name = t.instruments[instrument.id].name;
                const inner = (
                  <>
                    <InstrumentGlyph id={instrument.id} className="size-8" color={instrument.accent} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{name}</span>
                      <span className={cn("block font-mono text-[10px] tracking-wider uppercase", instrument.available ? "text-success" : "text-mist-500")}>
                        {instrument.available ? t.common.available : t.common.comingSoon}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={instrument.id}>
                    {instrument.available && instrument.href ? (
                      <Link
                        href={instrument.href}
                        className="flex items-center gap-3 rounded-2xl bg-pulse/10 p-3 ring-1 ring-pulse/40 transition-colors hover:bg-pulse/15"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.02] p-3 opacity-70 ring-1 ring-white/[0.06]">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </Reveal>

        {/* AI teacher — honest placeholder */}
        <Reveal delay={0.16}>
          <section className="relative h-full overflow-hidden rounded-[28px] border border-dashed border-white/15 p-6 sm:p-8" aria-labelledby="ai-title">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-warn uppercase ring-1 ring-warn/30">
              <FlaskConical className="size-3" aria-hidden />
              {t.common.inDevelopment}
            </span>
            <h2 id="ai-title" className="font-display mt-4 text-xl font-medium">
              {t.learn.aiTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mist-400">{t.learn.aiBody}</p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
