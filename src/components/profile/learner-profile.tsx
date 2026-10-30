"use client";

import { Award, Check, CheckCircle2, History, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PIANO_LESSONS } from "@/content/lessons/piano";
import { useProgressSummary } from "@/hooks/use-progress-summary";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { cn } from "@/lib/cn";
import { useStoresHydrated } from "@/store/hydration";
import { useProgressStore } from "@/store/progress";
import { Button } from "@/components/ui/button";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { LevelRing, ProgressBar } from "@/components/ui/progress";
import { Reveal } from "@/components/ui/reveal";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PageHeader } from "@/components/learn/page-header";

const LESSON_BY_ID = new Map(PIANO_LESSONS.map((lesson) => [lesson.id, lesson]));

export function LearnerProfile() {
  const { t, tag } = useI18n();
  const hydrated = useStoresHydrated();
  const { xp, completedLessons, completedPiano, totalPiano, levelInfo } = useProgressSummary();
  const history = useProgressStore((s) => s.history);
  const achievements = useProgressStore((s) => s.achievements);
  const notesPlayed = useProgressStore((s) => s.notesPlayed);
  const currentInstrument = useProgressStore((s) => s.currentInstrument);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const [confirming, setConfirming] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const dateTime = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" });
  const lessonTitle = (lessonId: string) => {
    const lesson = LESSON_BY_ID.get(lessonId);
    return lesson ? t.lessons[lesson.i18nKey].title : lessonId;
  };

  const stats = [
    { label: t.profile.totalXp, value: xp, accent: "text-gold" },
    { label: t.profile.level, value: levelInfo.level },
    { label: t.profile.lessonsCompleted, value: `${completedPiano}/${totalPiano}` },
    { label: t.profile.notesPlayed, value: notesPlayed.toLocaleString(tag) },
  ];

  const completedList = PIANO_LESSONS.filter((lesson) => completedLessons[lesson.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader eyebrow={t.profile.eyebrow} title={t.profile.title} subtitle={t.profile.subtitle} />

      {/* Identity + level */}
      <Reveal className="mt-10">
        <section className="glass flex flex-col gap-8 rounded-[28px] p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-center gap-5">
            {hydrated ? (
              <LevelRing level={levelInfo.level} progress={levelInfo.progress} size={124} label={t.common.level} />
            ) : (
              <div className="skeleton size-[124px] rounded-full!" />
            )}
            <div>
              <p className="text-sm text-mist-400">{t.profile.learner}</p>
              <p className="font-display mt-1 text-2xl font-medium">{t.profile.guest}</p>
              {hydrated && (
                <p className="mt-1 font-mono text-xs text-mist-500">
                  {format(t.learn.toNextLevel, { xp: levelInfo.xpToNext, level: levelInfo.level + 1 })}
                </p>
              )}
            </div>
          </div>
          <div className="flex-1 sm:max-w-sm sm:pl-4">
            <ProgressBar value={hydrated ? levelInfo.progress : 0} label={t.common.level} />
            <div className="mt-2 flex justify-between font-mono text-[11px] text-mist-500">
              <span>{hydrated ? levelInfo.levelStartXp : 0} XP</span>
              <span>{hydrated ? levelInfo.nextLevelXp : 0} XP</span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Stats */}
      <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={0.05 * index}>
            <div className="flex h-full flex-col-reverse rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/[0.07]">
              <dt className="mt-1 text-sm text-mist-400">{stat.label}</dt>
              <dd className={cn("font-display text-3xl font-medium", stat.accent)}>
                {hydrated ? stat.value : <span className="skeleton inline-block h-8 w-12" />}
              </dd>
            </div>
          </Reveal>
        ))}
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          {/* Preferences */}
          <Reveal>
            <section className="glass rounded-[28px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-mist-400">{t.profile.currentInstrument}</p>
                  <p className="mt-1 flex items-center gap-2 font-medium">
                    <InstrumentGlyph id={currentInstrument} className="size-7 text-pulse" />
                    {t.instruments[currentInstrument].name}
                  </p>
                </div>
              </div>
              <div className="hairline my-5" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-mist-400">{t.profile.language}</p>
                <LanguageSwitcher />
              </div>
            </section>
          </Reveal>

          {/* Completed lessons */}
          <Reveal delay={0.05}>
            <section className="glass rounded-[28px] p-6" aria-labelledby="completed-title">
              <h2 id="completed-title" className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                {t.profile.completedTitle}
              </h2>
              {hydrated && completedList.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {completedList.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/piano/lesson/${lesson.slug}`}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.06]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="bg-spectrum flex size-7 shrink-0 items-center justify-center rounded-full text-white">
                            <Check className="size-3.5" strokeWidth={3} aria-hidden />
                          </span>
                          <span className="truncate text-sm">{t.lessons[lesson.i18nKey].title}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-gold">
                          +{completedLessons[lesson.id].xpAwarded} XP
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-mist-500">{hydrated ? t.profile.noneCompleted : t.common.loading}</p>
              )}
            </section>
          </Reveal>

          {/* Achievements */}
          <Reveal delay={0.1}>
            <section className="glass rounded-[28px] p-6" aria-labelledby="achievements-title">
              <h2 id="achievements-title" className="flex items-center gap-2 font-medium">
                <Award className="size-4 text-gold" aria-hidden />
                {t.profile.achievementsTitle}
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked = hydrated && Boolean(achievements[achievement.id]);
                  const copy = t.achievements[achievement.i18nKey];
                  return (
                    <li
                      key={achievement.id}
                      className={cn(
                        "rounded-2xl p-3 ring-1",
                        unlocked ? "bg-gold/[0.07] ring-gold/25" : "bg-white/[0.02] ring-white/[0.06]",
                      )}
                    >
                      <span className={cn("flex items-center gap-1.5 text-sm font-medium", !unlocked && "text-mist-400")}>
                        {unlocked ? (
                          <Award className="size-3.5 text-gold" aria-hidden />
                        ) : (
                          <Lock className="size-3.5 text-mist-500" aria-hidden />
                        )}
                        {copy.title}
                      </span>
                      <span className="mt-1 block text-xs text-mist-500">{copy.description}</span>
                      <span className="sr-only">{unlocked ? t.common.completed : t.common.locked}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>
        </div>

        {/* History */}
        <Reveal delay={0.08}>
          <section className="glass h-full rounded-[28px] p-6" aria-labelledby="history-title">
            <h2 id="history-title" className="flex items-center gap-2 font-medium">
              <History className="size-4 text-ion" aria-hidden />
              {t.profile.historyTitle}
            </h2>
            {hydrated && history.length > 0 ? (
              <ol className="relative mt-5 space-y-5 border-l border-white/10 pl-6">
                {history.map((event) => (
                  <li key={`${event.type}-${event.at}-${"lessonId" in event ? event.lessonId : event.achievementId}`} className="relative">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1 -left-[1.95rem] size-3 rounded-full ring-4 ring-ink-900",
                        event.type === "lesson-completed" ? "bg-pulse" : "bg-gold",
                      )}
                    />
                    <p className="text-sm">
                      {event.type === "lesson-completed"
                        ? format(t.profile.lessonCompleted, { lesson: lessonTitle(event.lessonId) })
                        : format(t.profile.achievementUnlocked, { achievement: t.achievements[event.achievementId].title })}
                      {event.type === "lesson-completed" && event.xp > 0 && (
                        <span className="ml-2 font-mono text-xs text-gold">+{event.xp} XP</span>
                      )}
                    </p>
                    <time dateTime={event.at} className="mt-0.5 block font-mono text-xs text-mist-500">
                      {dateTime.format(new Date(event.at))}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-mist-500">{hydrated ? t.profile.historyEmpty : t.common.loading}</p>
            )}

            <div className="hairline my-8" />

            <div>
              <h3 className="text-sm font-medium">{t.profile.resetTitle}</h3>
              <p className="mt-1 text-xs text-mist-500">{t.profile.resetBody}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {confirming ? (
                  <>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        resetProgress();
                        setConfirming(false);
                        setResetDone(true);
                      }}
                    >
                      {t.profile.resetConfirm}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                      {t.profile.resetCancel}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!hydrated}
                    onClick={() => {
                      setConfirming(true);
                      setResetDone(false);
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {t.profile.resetButton}
                  </Button>
                )}
                {resetDone && (
                  <p role="status" className="text-xs text-success">
                    {t.profile.resetDone}
                  </p>
                )}
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
