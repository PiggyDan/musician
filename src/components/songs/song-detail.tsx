"use client";

import { ArrowLeft, BookOpen, Download, FileText, Music, ShieldCheck, ShieldOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { INSTRUMENTS } from "@/content/instruments";
import { getPianoLesson } from "@/content/lessons/piano";
import { getScore } from "@/content/sheet-music/catalog";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import type { Song } from "@/lib/catalog/types";
import { musicXmlPath, pdfPath } from "@/lib/sheet-music/library";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { AuthorizedPlayer } from "./authorized-player";

export function SongDetail({ song }: { song: Song }) {
  const { t, locale } = useI18n();
  const s = t.songs;
  const m = song.metadata;
  const open = song.rights !== "metadata-only";
  const lessons = [...new Set(song.practice.map((p) => p.relatedLesson).filter(Boolean))].map((slug) => getPianoLesson(slug!)!);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-28 pb-12 sm:px-6 sm:pt-32">
      <Link href="/songs" className="inline-flex items-center gap-2 rounded-full py-1 pr-3 text-sm text-mist-400 hover:text-mist-50">
        <ArrowLeft className="size-4" aria-hidden />
        {s.back}
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-[2rem] leading-tight font-medium tracking-tight sm:text-5xl">{m.title[locale]}</h1>
        <p className="mt-2 text-mist-400">
          {m.artist[locale]} · {m.year}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {m.genres.map((g) => (
            <span key={g} className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-mist-200 ring-1 ring-white/10">
              {s.genres[g]}
            </span>
          ))}
        </div>
        <p
          className={`mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ring-1 ${
            open ? "bg-success/[0.07] text-mist-200 ring-success/25" : "bg-warn/[0.06] text-mist-200 ring-warn/25"
          }`}
        >
          {open ? <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <ShieldOff className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />}
          {s.rights[song.rights]}
        </p>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title={s.listen}>
          <AuthorizedPlayer sources={song.playback} externalLinks={song.externalLinks} />
        </Panel>

        <Panel title={s.sheetTitle}>
          {song.sheetMusic.status === "available" ? (
            <ul className="space-y-2">
              {song.sheetMusic.scoreIds.map((id) => {
                const score = getScore(id)!;
                const instrument = INSTRUMENTS.find((i) => i.id === score.instrument)!;
                return (
                  <li key={id}>
                    <Link
                      href={`/sheet-music/${id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.07] hover:bg-white/[0.06]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <InstrumentGlyph id={score.instrument} className="size-6" color={instrument.accent} />
                        <span className="truncate text-sm">{score.title[locale]}</span>
                      </span>
                      <span className="shrink-0 text-xs text-ion">{s.openScore}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center">
              <Music className="mx-auto size-6 text-mist-500" aria-hidden />
              <p className="mt-2 font-medium">{s.sheetUnavailable}</p>
              <p className="mt-1 text-sm text-mist-400">{s.sheetUnavailableBody}</p>
            </div>
          )}
        </Panel>

        <Panel title={s.practiceTitle}>
          {song.practice.length === 0 ? (
            <p className="text-sm text-mist-400">{s.practiceNone}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[...new Set(song.practice.map((p) => p.instrument))].map((id) => (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] py-1 pr-3 pl-1.5 text-xs text-mist-200">
                    <InstrumentGlyph id={id} className="size-4" color={INSTRUMENTS.find((i) => i.id === id)?.accent} />
                    {t.instruments[id].name}
                  </span>
                ))}
              </div>
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/piano/lesson/${lesson.slug}`}
                  className="flex items-center gap-2 rounded-2xl bg-pulse/10 px-4 py-3 text-sm ring-1 ring-pulse/30 hover:bg-pulse/15"
                >
                  <BookOpen className="size-4 text-pulse" aria-hidden />
                  {format(s.relatedLesson, { n: lesson.order, title: t.lessons[lesson.i18nKey].title })}
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={s.downloadsTitle}>
          {song.downloads.scoreIds.length === 0 ? (
            <p className="text-sm text-mist-400">{s.downloadsNone}</p>
          ) : (
            <ul className="space-y-2">
              {song.downloads.scoreIds.map((id) => {
                const score = getScore(id)!;
                return (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-mist-200">{score.title[locale]} · {t.instruments[score.instrument].name}</span>
                    <span className="flex gap-3">
                      <a href={musicXmlPath(score)} download className="inline-flex items-center gap-1 text-ion hover:underline">
                        <Download className="size-3.5" aria-hidden />
                        MusicXML
                      </a>
                      {score.formats.includes("pdf") && (
                        <a href={pdfPath(score)} download className="inline-flex items-center gap-1 text-ion hover:underline">
                          <FileText className="size-3.5" aria-hidden />
                          PDF
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-mist-500">{s.downloadsRecording}</p>
        </Panel>
      </div>

      {!open && (
        <aside className="mt-8 rounded-3xl bg-white/[0.02] p-6 ring-1 ring-white/[0.07]">
          <h2 className="font-medium">{s.planTitle}</h2>
          <p className="mt-2 text-sm text-mist-400">{s.planBody}</p>
        </aside>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-[28px] p-6">
      <h2 className="font-display mb-4 text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}
