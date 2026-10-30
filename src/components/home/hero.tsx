"use client";

import { motion } from "motion/react";
import { ArrowRight, AudioLines, Keyboard } from "lucide-react";
import { useState } from "react";
import { audioEngine } from "@/audio/engine";
import { INSTRUMENTS } from "@/content/instruments";
import { PIANO_LESSONS } from "@/content/lessons/piano";
import { LOCALES } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { Button, ButtonLink } from "@/components/ui/button";
import { WaveField } from "./wave-field";

/** A gentle I–vi–IV–V cycle of rich voicings, one chord per press. */
const CHORDS: readonly (readonly number[])[] = [
  [48, 55, 64, 71, 74], // Cmaj9
  [45, 52, 60, 67, 71], // Am9
  [41, 48, 57, 64, 67], // Fmaj9
  [43, 50, 59, 65, 69], // G9
];

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const { t } = useI18n();
  const [chordIndex, setChordIndex] = useState(0);

  const playChord = () => {
    audioEngine.playPhrase(CHORDS[chordIndex], { stagger: 0.07, hold: 1.6 });
    setChordIndex((index) => (index + 1) % CHORDS.length);
  };

  const stats = [
    { value: INSTRUMENTS.length, label: t.home.stats.instruments },
    { value: PIANO_LESSONS.length, label: t.home.stats.lessons },
    { value: LOCALES.length, label: t.home.stats.languages },
  ];

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-24 pb-16">
      {/* Atmosphere */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="animate-drift absolute -top-1/4 right-[-10%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(106,85,255,0.32),transparent_65%)] blur-2xl" />
        <div className="animate-drift absolute bottom-[-20%] left-[-10%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(47,216,238,0.16),transparent_65%)] blur-2xl [animation-delay:-9s]" />
        <WaveField className="absolute inset-0 opacity-90" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-mist-200 sm:text-sm"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ion opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ion" />
          </span>
          {t.home.eyebrow}
        </motion.p>

        <h1 className="font-display mt-7 text-[clamp(2.6rem,9vw,6.6rem)] leading-[0.98] font-medium tracking-[-0.03em]">
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease }}
          >
            {t.home.titleTop}
          </motion.span>
          <motion.span
            className="text-spectrum block pb-2"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease }}
          >
            {t.home.titleBottom}
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease }}
          className="mt-6 max-w-xl text-base leading-relaxed text-mist-200 sm:text-lg"
        >
          {t.home.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.42, ease }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <ButtonLink href="/learn" size="lg">
            {t.common.startLearning}
            <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden />
          </ButtonLink>
          <Button variant="secondary" size="lg" onClick={playChord}>
            <AudioLines className="size-4 text-ion" aria-hidden />
            {t.home.playChord}
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-5 flex items-center gap-2 text-xs text-mist-500 sm:text-sm"
        >
          <Keyboard className="hidden size-4 sm:block" aria-hidden />
          {t.home.heroHint}
        </motion.p>

        <motion.dl
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
          className="mt-14 grid max-w-xl grid-cols-3 gap-4 border-t border-white/[0.07] pt-6"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse">
              <dt className="mt-1 text-xs leading-snug text-mist-400 sm:text-sm">{stat.label}</dt>
              <dd className="font-display text-2xl font-medium sm:text-3xl">{stat.value}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
