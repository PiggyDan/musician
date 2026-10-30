"use client";

import { motion } from "motion/react";
import { BookOpen, Ear, Hand, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { Reveal, SectionHeading } from "@/components/ui/reveal";

const ICONS = [BookOpen, Hand, Ear, TrendingUp];

export function HowItWorks() {
  const { t } = useI18n();
  const steps = t.home.how.steps;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <Reveal>
        <SectionHeading eyebrow={t.home.how.eyebrow} title={t.home.how.title} subtitle={t.home.how.subtitle} />
      </Reveal>

      <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
        {/* The path that connects the steps: vertical on mobile, horizontal on desktop. */}
        <motion.div
          aria-hidden
          className="bg-spectrum absolute top-6 left-6 hidden h-px origin-left md:block"
          style={{ right: "calc(25% - 1.125rem - 24px)" }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          aria-hidden
          className="bg-spectrum absolute top-6 bottom-6 left-6 w-px origin-top md:hidden"
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />

        {steps.map((step, index) => {
          const Icon = ICONS[index] ?? BookOpen;
          return (
            <li key={step.title} className="relative">
              <Reveal delay={0.12 * index} className="flex gap-5 md:flex-col md:gap-6">
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink-850 ring-1 ring-white/10 shadow-[0_0_30px_-6px_rgba(106,85,255,0.6)]">
                  <Icon className="size-5 text-ion" aria-hidden />
                </span>
                <div>
                  <p className="font-mono text-xs text-mist-500">0{index + 1}</p>
                  <h3 className="mt-1.5 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist-400">{step.body}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
