"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { audioEngine } from "@/audio/engine";
import { useElementWidth } from "@/hooks/use-element-width";
import { useI18n } from "@/i18n/use-i18n";
import { MIDDLE_C, offsetWhiteKeys } from "@/lib/music/notes";
import { useSettingsStore } from "@/store/settings";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, SectionHeading } from "@/components/ui/reveal";
import { NoteReadout } from "@/components/piano/note-readout";
import { PianoKeyboard } from "@/components/piano/piano-keyboard";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";

const MIN_WHITE_KEY_PX = 34;

export function PianoPreview() {
  const { t } = useI18n();
  const showKeyHints = useSettingsStore((s) => s.showKeyHints);
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef, 900);

  // Fit 8–15 white keys around Middle C; the computer keyboard starts on C4.
  const whiteKeyCount = Math.min(15, Math.max(8, Math.floor(width / MIN_WHITE_KEY_PX)));
  const startMidi = whiteKeyCount >= 15 ? 48 : offsetWhiteKeys(MIDDLE_C, -Math.floor((whiteKeyCount - 8) / 2));

  useComputerKeyboard({ baseMidi: MIDDLE_C });
  useEffect(() => audioEngine.preload(), []);

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <Reveal>
          <SectionHeading eyebrow={t.home.preview.eyebrow} title={t.home.preview.title} subtitle={t.home.preview.subtitle} />
        </Reveal>
        <Reveal delay={0.1}>
          <ButtonLink href="/practice" variant="secondary">
            {t.home.preview.cta}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </Reveal>
      </div>

      <Reveal delay={0.1} className="mt-12">
        <div ref={containerRef} className="relative">
          <div aria-hidden className="absolute inset-x-0 -top-10 -bottom-16 -z-10 bg-[radial-gradient(60%_60%_at_50%_60%,rgba(106,85,255,0.22),transparent_70%)]" />
          <PianoKeyboard
            startMidi={startMidi}
            whiteKeyCount={whiteKeyCount}
            keyHintBase={showKeyHints ? MIDDLE_C : null}
            size="lg"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <NoteReadout />
          <p className="hidden max-w-60 text-sm text-mist-500 md:block">{t.home.preview.keyboardHint}</p>
        </div>
      </Reveal>
    </section>
  );
}
