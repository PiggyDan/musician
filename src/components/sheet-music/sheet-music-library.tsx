"use client";

import { Info, Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { INSTRUMENTS, type InstrumentId } from "@/content/instruments";
import { COMPOSERS, SCORES, type ComposerId, type Difficulty, type Genre } from "@/content/sheet-music/catalog";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { EMPTY_FILTERS, filterScores, type LibraryFilters } from "@/lib/sheet-music/library";
import { cn } from "@/lib/cn";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/learn/page-header";
import { ScoreCard } from "./score-card";

const DIFFICULTIES: Difficulty[] = ["beginner", "elementary", "intermediate"];
const GENRES: Genre[] = ["classical", "folk", "hymn", "exercise"];
// Only offer filter values that actually have scores — no empty dead ends.
const USED_DIFFICULTIES = DIFFICULTIES.filter((d) => SCORES.some((s) => s.difficulty === d));
const USED_GENRES = GENRES.filter((g) => SCORES.some((s) => s.genre === g));
const USED_COMPOSERS = (Object.keys(COMPOSERS) as ComposerId[]).filter((c) => SCORES.some((s) => s.composer === c));

export function SheetMusicLibrary() {
  const { t, locale } = useI18n();
  const sm = t.sheetMusic;
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS);
  const results = useMemo(() => filterScores(SCORES, filters), [filters]);
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);
  const set = <K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader eyebrow={sm.eyebrow} title={sm.title} subtitle={sm.subtitle} />

      <div className="glass mt-10 rounded-[28px] p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">{sm.searchLabel}</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist-500" aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder={sm.searchPlaceholder}
            className="h-12 w-full rounded-2xl bg-ink-900/80 pr-4 pl-11 text-base text-mist-50 ring-1 ring-white/10 transition-shadow outline-none placeholder:text-mist-500 focus:ring-2 focus:ring-pulse/60"
          />
        </label>

        <div className="mt-4" role="group" aria-label={sm.filters.instrument}>
          <div className="flex flex-wrap gap-2">
            <Chip selected={filters.instrument === "all"} onClick={() => set("instrument", "all")}>
              {sm.filters.all}
            </Chip>
            {INSTRUMENTS.map((instrument) => (
              <Chip
                key={instrument.id}
                selected={filters.instrument === instrument.id}
                onClick={() => set("instrument", filters.instrument === instrument.id ? "all" : (instrument.id as InstrumentId))}
              >
                <InstrumentGlyph id={instrument.id} className="size-4" color={instrument.accent} />
                {t.instruments[instrument.id].name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Select label={sm.filters.difficulty} value={filters.difficulty} onChange={(v) => set("difficulty", v as LibraryFilters["difficulty"])}>
            <option value="all">{sm.filters.all}</option>
            {USED_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {sm.difficulty[d]}
              </option>
            ))}
          </Select>
          <Select label={sm.filters.genre} value={filters.genre} onChange={(v) => set("genre", v as LibraryFilters["genre"])}>
            <option value="all">{sm.filters.all}</option>
            {USED_GENRES.map((g) => (
              <option key={g} value={g}>
                {sm.genre[g]}
              </option>
            ))}
          </Select>
          <Select label={sm.filters.composer} value={filters.composer} onChange={(v) => set("composer", v as LibraryFilters["composer"])}>
            <option value="all">{sm.filters.all}</option>
            {USED_COMPOSERS.map((c) => (
              <option key={c} value={c}>
                {COMPOSERS[c].name[locale]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="font-mono text-sm text-mist-400" role="status">
          {results.length === 1 ? sm.resultsOne : format(sm.results, { n: results.length })}
        </p>
        {dirty && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X className="size-4" aria-hidden />
            {sm.filters.clear}
          </Button>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((score) => (
            <li key={score.id}>
              <ScoreCard score={score} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
          <p className="font-display text-xl font-medium">{sm.emptyTitle}</p>
          <p className="mt-2 text-sm text-mist-400">{sm.emptyBody}</p>
          <Button variant="secondary" size="sm" className="mt-6" onClick={() => setFilters(EMPTY_FILTERS)}>
            {sm.filters.clear}
          </Button>
        </div>
      )}

      <aside className="mt-10 flex gap-4 rounded-3xl bg-white/[0.02] p-6 ring-1 ring-white/[0.07]">
        <Info className="mt-0.5 size-5 shrink-0 text-ion" aria-hidden />
        <div>
          <h2 className="font-medium">{sm.aboutTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist-400">{sm.aboutBody}</p>
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

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-mist-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 cursor-pointer rounded-2xl bg-ink-900/80 px-3.5 text-sm text-mist-50 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-pulse/60"
      >
        {children}
      </select>
    </label>
  );
}
