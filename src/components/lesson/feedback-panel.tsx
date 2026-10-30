"use client";

import { motion } from "motion/react";
import { Check, Ear } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FeedbackTone = "idle" | "correct" | "wrong";

/**
 * The single line of feedback under every lesson prompt. Announced politely to
 * screen readers; a new `messageKey` re-triggers the entry animation.
 */
export function FeedbackPanel({
  tone,
  message,
  messageKey,
  badge,
  detail,
  className,
}: {
  tone: FeedbackTone;
  message: string;
  messageKey: string | number;
  /** Short text in the round badge (e.g. the note played). */
  badge?: string;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-16 items-center gap-4 rounded-2xl px-5 py-4 ring-1 transition-colors duration-300",
        tone === "correct" && "bg-success/10 ring-success/40",
        tone === "wrong" && "bg-warn/[0.08] ring-warn/30",
        tone === "idle" && "bg-white/[0.03] ring-white/[0.08]",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          tone === "correct" && "bg-success text-ink-950",
          tone === "wrong" && "bg-warn/15 text-warn",
          tone === "idle" && "bg-ion/10 text-ion",
        )}
      >
        {tone === "correct" ? (
          <Check className="size-5" strokeWidth={3} aria-hidden />
        ) : badge ? (
          <span className="font-mono text-[11px] font-semibold">{badge}</span>
        ) : (
          <Ear className="size-4.5 animate-pulse" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        {/* New messages replace old ones instantly (no exit wait) so timing
            feedback like "Perfect" appears the moment the note is played. */}
        <motion.p
          key={messageKey}
          initial={{ opacity: 0.4, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className={cn("text-sm sm:text-base", tone === "correct" ? "font-medium text-success" : "text-mist-200")}
        >
          {message}
        </motion.p>
        {detail}
      </div>
    </div>
  );
}

/** Row of dots showing progress through a multi-item exercise. */
export function StepDots({
  total,
  done,
  failedIndex,
  label,
}: {
  total: number;
  done: number;
  failedIndex?: number | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i < done && "bg-spectrum w-5",
            i === done && (failedIndex === i ? "w-5 bg-warn" : "w-5 bg-white/35"),
            i > done && "w-2 bg-white/12",
          )}
        />
      ))}
    </div>
  );
}
