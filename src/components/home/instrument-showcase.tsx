"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { INSTRUMENTS } from "@/content/instruments";
import { useI18n } from "@/i18n/use-i18n";
import { InstrumentGlyph } from "@/components/ui/instrument-glyph";
import { Reveal, SectionHeading } from "@/components/ui/reveal";

export function InstrumentShowcase() {
  const { t } = useI18n();
  const [featured, ...upcoming] = INSTRUMENTS;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <SectionHeading
          eyebrow={t.home.instruments.eyebrow}
          title={t.home.instruments.title}
          subtitle={t.home.instruments.subtitle}
        />
      </Reveal>

      <div className="mt-14 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Reveal>
          <Link
            href={featured.href ?? "/learn"}
            className="group relative flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-[28px] p-7 ring-1 ring-white/10 transition-shadow duration-500 hover:shadow-[0_30px_80px_-30px_rgba(106,85,255,0.7)] sm:p-9"
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(106,85,255,0.35),transparent_55%),linear-gradient(160deg,#16162a,#0b0b15)]"
            />
            {/* Stylised key bed fading in from the bottom edge. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 flex h-16 gap-[3px] px-7 opacity-25 transition-opacity duration-500 group-hover:opacity-40 sm:px-9">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className="flex-1 rounded-t-md bg-gradient-to-b from-white/80 to-white/10" />
              ))}
            </div>

            <div className="flex items-start justify-between gap-4">
              <InstrumentGlyph id="piano" className="size-16" color={featured.accent} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 font-mono text-[11px] tracking-wider text-success uppercase ring-1 ring-success/30">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                {t.home.instruments.openNow}
              </span>
            </div>
            <div className="mt-10 mb-20">
              <h3 className="font-display text-3xl font-medium sm:text-4xl">{t.instruments.piano.name}</h3>
              <p className="mt-2 text-mist-200">{t.instruments.piano.tagline}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ion">
                {t.common.startLearning}
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </span>
            </div>
          </Link>
        </Reveal>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {upcoming.map((instrument, index) => (
            <li key={instrument.id} className="last:odd:col-span-2">
              <Reveal delay={0.06 * index} className="h-full">
                <Link
                  href={instrument.href ?? "/learn"}
                  className="relative flex h-full min-h-36 flex-col justify-between rounded-3xl bg-white/[0.025] p-5 ring-1 ring-white/[0.07] transition-colors hover:bg-white/[0.05]"
                >
                  <InstrumentGlyph id={instrument.id} className="size-10 opacity-70" color={instrument.accent} />
                  <div className="mt-6">
                    <h3 className="font-medium">{t.instruments[instrument.id].name}</h3>
                    <p className="mt-0.5 text-xs text-mist-500">{t.instruments[instrument.id].tagline}</p>
                  </div>
                  <span className="absolute top-4 right-4 rounded-full bg-success/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-success uppercase">
                    {t.common.available}
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
