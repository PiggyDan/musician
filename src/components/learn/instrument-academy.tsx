"use client";

import { ArrowRight, Music, RotateCcw } from "lucide-react";
import Link from "next/link";
import { INSTRUMENTS, type InstrumentId } from "@/content/instruments";
import { getCourse } from "@/content/lessons/instruments";
import { getLessonState } from "@/content/lessons/piano";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { useStoresHydrated } from "@/store/hydration";
import { useProgressStore } from "@/store/progress";
import { ButtonLink } from "@/components/ui/button";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { InstrumentPad } from "@/components/instruments/instrument-pad";
import { LessonNode } from "./lesson-node";
import { PageHeader } from "./page-header";

/** Course page for a non-piano instrument: playable instrument + its lessons. */
export function InstrumentAcademy({ instrument }: { instrument: Exclude<InstrumentId, "piano"> }) {
  const { t } = useI18n();
  const a = t.academy;
  const hydrated = useStoresHydrated();
  const completed = useProgressStore((s) => s.completedLessons);
  const lessons = getCourse(instrument);
  const name = t.instruments[instrument].name;
  const accent = INSTRUMENTS.find((i) => i.id === instrument)!.accent;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader eyebrow={format(a.instrumentEyebrow, { instrument: name })} title={format(a.instrumentTitle, { instrument: name })} subtitle={format(a.instrumentSubtitle, { instrument: name })}>
        <InstrumentGlyph id={instrument} className="hidden size-20 sm:block" color={accent} />
      </PageHeader>

      <section className="mt-8" aria-label={t.pad.tryIt}>
        <p className="mb-3 text-sm text-mist-400">{t.pad.tryIt}</p>
        <InstrumentPad instrument={instrument} />
      </section>

      <ol className="mt-10 space-y-4" aria-label={a.pathLabel}>
        {lessons.map((lesson) => {
          const state = hydrated ? getLessonState(lesson, completed, lessons) : "locked";
          const copy = t.lessons[lesson.i18nKey];
          const href = `/learn/${instrument}/lesson/${lesson.slug}`;
          return (
            <li
              key={lesson.id}
              className={cn(
                "flex gap-4 rounded-3xl p-5 ring-1 sm:gap-6 sm:p-6",
                state === "available" ? "glass ring-pulse/40" : "bg-white/[0.025] ring-white/[0.07]",
              )}
            >
              <LessonNode state={state} order={lesson.order} />
              <div className="flex-1">
                <h2 className="text-lg font-medium">{copy.title}</h2>
                <p className="mt-1 text-sm text-mist-400">{copy.summary}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <span className="font-mono text-xs text-gold/90">{format(a.xpReward, { xp: lesson.xp })}</span>
                  {state === "available" && (
                    <ButtonLink href={href} size="sm">
                      {a.start}
                      <ArrowRight className="size-3.5" aria-hidden />
                    </ButtonLink>
                  )}
                  {state === "completed" && (
                    <ButtonLink href={href} size="sm" variant="secondary">
                      <RotateCcw className="size-3.5" aria-hidden />
                      {a.replay}
                    </ButtonLink>
                  )}
                  {state === "locked" && hydrated && <span className="text-xs text-mist-500">{a.lockedHint}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/sheet-music?instrument=${instrument}`}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-mist-200 ring-1 ring-white/10 hover:bg-white/[0.09]"
        >
          <Music className="size-4" aria-hidden />
          {format(a.sheetFor, { instrument: name })}
        </Link>
      </div>
      <p className="mt-4 text-xs text-mist-500">{a.moreSoon}</p>
    </div>
  );
}
