"use client";

import { CircleDashed, FlaskConical } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import { Reveal } from "@/components/ui/reveal";

/**
 * Honest preview of the planned AI tutor. Nothing here simulates AI output —
 * it describes what is planned and states clearly that it isn't available.
 */
export function AiTeacherTeaser() {
  const { t } = useI18n();
  const ai = t.home.ai;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] p-7 ring-1 ring-white/10 sm:p-12">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(80%_120%_at_0%_100%,rgba(47,216,238,0.12),transparent_60%),radial-gradient(70%_100%_at_100%_0%,rgba(106,85,255,0.18),transparent_60%),#0b0b16]"
          />
          {/* Dashed orbit motif: the teacher is a planned shape, not yet filled in. */}
          <svg aria-hidden viewBox="0 0 400 400" className="absolute -right-24 -bottom-24 size-[26rem] opacity-30">
            {[180, 140, 100].map((r) => (
              <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#8b7bff" strokeDasharray="3 9" />
            ))}
            <circle cx="200" cy="200" r="36" fill="none" stroke="#2fd8ee" strokeDasharray="2 6" />
          </svg>

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="eyebrow">{ai.eyebrow}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-warn uppercase ring-1 ring-warn/30">
                  <FlaskConical className="size-3" aria-hidden />
                  {ai.notice}
                </span>
              </div>
              <h2 className="font-display mt-5 text-[1.75rem] leading-[1.15] font-medium tracking-tight sm:text-4xl">
                {ai.title}
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-mist-400">{ai.body}</p>
            </div>
            <ul className="space-y-3 self-center">
              {ai.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-3 rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-mist-200"
                >
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-mist-500" aria-hidden />
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
