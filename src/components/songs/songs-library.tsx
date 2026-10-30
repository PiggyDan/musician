"use client";

import { ArrowUpRight, Info, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { INSTRUMENTS, type InstrumentId } from "@/content/instruments";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { EMPTY_QUERY, GENRES, hasOfficialVideo, isPlayableHere, searchSongs, songSlug } from "@/lib/catalog/service";
import type { Song, SongQuery } from "@/lib/catalog/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { PageHeader } from "@/components/learn/page-header";

export function SongsLibrary({ songs }: { songs: readonly Song[] }) {
  const { t, locale } = useI18n();
  const s = t.songs;
  const [query, setQuery] = useState<SongQuery>(EMPTY_QUERY);
  const results = useMemo(() => searchSongs(songs, query), [songs, query]);
  const dirty = JSON.stringify(query) !== JSON.stringify(EMPTY_QUERY);
  const set = <K extends keyof SongQuery>(key: K, value: SongQuery[K]) => setQuery((q) => ({ ...q, [key]: value }));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader eyebrow={s.eyebrow} title={s.title} subtitle={s.subtitle} />

      <div className="glass mt-10 rounded-[28px] p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">{s.searchLabel}</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist-500" aria-hidden />
          <input
            type="search"
            value={query.text}
            onChange={(e) => set("text", e.target.value)}
            placeholder={s.searchPlaceholder}
            className="h-12 w-full rounded-2xl bg-ink-900/80 pr-4 pl-11 text-base text-mist-50 ring-1 ring-white/10 outline-none placeholder:text-mist-500 focus:ring-2 focus:ring-pulse/60"
          />
        </label>

        <p className="mt-4 mb-2 text-xs text-mist-400">{s.genre}</p>
        <div role="group" aria-label={s.genre} className="flex flex-wrap gap-2">
          <Chip selected={query.genre === "all"} onClick={() => set("genre", "all")}>
            {s.all}
          </Chip>
          {GENRES.map((g) => (
            <Chip key={g} selected={query.genre === g} onClick={() => set("genre", query.genre === g ? "all" : g)}>
              {s.genres[g]}
            </Chip>
          ))}
        </div>

        <p className="mt-4 mb-2 text-xs text-mist-400">{s.instrument}</p>
        <div role="group" aria-label={s.instrument} className="flex flex-wrap gap-2">
          <Chip selected={query.instrument === "all"} onClick={() => set("instrument", "all")}>
            {s.all}
          </Chip>
          {INSTRUMENTS.map((i) => (
            <Chip
              key={i.id}
              selected={query.instrument === i.id}
              onClick={() => set("instrument", query.instrument === i.id ? "all" : (i.id as InstrumentId))}
            >
              <InstrumentGlyph id={i.id} className="size-4" color={i.accent} />
              {t.instruments[i.id].name}
            </Chip>
          ))}
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-mist-200">
          <input
            type="checkbox"
            checked={query.playableOnly}
            onChange={(e) => set("playableOnly", e.target.checked)}
            className="size-4 accent-[#8b7bff]"
          />
          {s.playableOnly}
        </label>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-mist-400" role="status">
          {results.length === 1 ? s.resultsOne : format(s.results, { n: results.length })}
        </p>
        {dirty && (
          <Button variant="ghost" size="sm" onClick={() => setQuery(EMPTY_QUERY)}>
            <X className="size-4" aria-hidden />
            {s.clear}
          </Button>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((song) => {
            const playable = isPlayableHere(song);
            const video = hasOfficialVideo(song);
            const instruments = [...new Set(song.practice.map((p) => p.instrument))];
            return (
              <li key={song.id}>
                <Link
                  href={`/songs/${songSlug(song.id)}`}
                  className="group flex h-full flex-col rounded-3xl bg-white/[0.025] p-5 ring-1 ring-white/[0.08] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-white/[0.045]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg leading-snug font-medium">{song.metadata.title[locale]}</h2>
                      <p className="mt-0.5 truncate text-sm text-mist-400">
                        {song.metadata.artist[locale]} · {song.metadata.year}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-mist-500 group-hover:text-ion" aria-hidden />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {song.metadata.genres.map((g) => (
                      <span key={g} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-mist-200">
                        {s.genres[g]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs",
                        playable ? "bg-success/10 text-success" : video ? "bg-ion/10 text-ion" : "bg-white/[0.05] text-mist-400",
                      )}
                    >
                      {playable ? s.badges.playable : video ? s.badges.video : s.badges.discovery}
                    </span>
                    {instruments.map((id) => (
                      <InstrumentGlyph key={id} id={id} className="size-5" color={INSTRUMENTS.find((i) => i.id === id)?.accent} />
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="font-display text-xl font-medium">{s.emptyTitle}</p>
          <p className="mt-2 text-sm text-mist-400">{s.emptyBody}</p>
        </div>
      )}

      <aside className="mt-10 flex gap-4 rounded-3xl bg-white/[0.02] p-6 ring-1 ring-white/[0.07]">
        <Info className="mt-0.5 size-5 shrink-0 text-ion" aria-hidden />
        <div>
          <h2 className="font-medium">{s.noticeTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist-400">{s.notice}</p>
        </div>
      </aside>
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm ring-1 transition-colors",
        selected ? "bg-pulse/15 text-mist-50 ring-pulse/50" : "bg-white/[0.03] text-mist-400 ring-white/10 hover:text-mist-200",
      )}
    >
      {children}
    </button>
  );
}
