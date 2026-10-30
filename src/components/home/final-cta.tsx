"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta() {
  const { t } = useI18n();
  return (
    <section className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
      <Reveal>
        <div aria-hidden className="mx-auto mb-10 flex h-16 items-end justify-center gap-1.5">
          {[0.35, 0.6, 1, 0.75, 0.5, 0.85, 0.4].map((h, i) => (
            <span
              key={i}
              className="bg-spectrum w-1.5 rounded-full opacity-80"
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
        <h2 className="font-display text-[2rem] leading-[1.1] font-medium tracking-tight sm:text-5xl">
          {t.home.final.title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-mist-400 sm:text-lg">{t.home.final.body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/learn/piano/lesson/1" size="lg">
            {t.common.startLearning}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/practice" variant="secondary" size="lg">
            {t.common.openStudio}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
