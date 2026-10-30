"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActiveNotes } from "@/audio/hooks";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { detectChord } from "@/lib/music/chords";
import { midiToNoteName } from "@/lib/music/notes";
import { cn } from "@/lib/cn";

/** Live display of held notes and the chord they form. */
export function NoteReadout({ className }: { className?: string }) {
  const { t } = useI18n();
  const notes = useActiveNotes();
  const chord = detectChord(notes);

  return (
    <div className={cn("glass flex min-h-24 flex-col justify-center rounded-3xl px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-mist-400!">{t.studio.nowPlaying}</p>
        {notes.length > 1 && (
          <p className="font-mono text-[11px] text-mist-500">{format(t.studio.notesCount, { n: notes.length })}</p>
        )}
      </div>
      {/* Visual only — announcing every keypress would overwhelm screen readers. */}
      <div className="mt-2 flex min-h-10 flex-wrap items-baseline gap-x-3 gap-y-1" aria-hidden>
        {notes.length === 0 ? (
          <span className="text-lg text-mist-500">{t.studio.nothingPlaying}</span>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {chord && (
              <motion.span
                key={`chord-${chord}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="font-display text-spectrum mr-1 text-3xl font-medium"
              >
                {chord}
              </motion.span>
            )}
            {notes.map((midi) => (
              <motion.span
                key={midi}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "font-mono",
                  chord ? "text-sm text-mist-200" : "font-display text-3xl font-medium text-mist-50",
                )}
              >
                {midiToNoteName(midi)}
              </motion.span>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
