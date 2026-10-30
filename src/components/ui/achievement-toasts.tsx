"use client";

import { AnimatePresence, motion } from "motion/react";
import { Award } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { useToastStore, type AchievementToast } from "@/store/toasts";

const TOAST_MS = 4200;

export function AchievementToasts() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.key} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ toast }: { toast: AchievementToast }) {
  const { t } = useI18n();
  const dismiss = useToastStore((s) => s.dismiss);
  const copy = t.achievements[toast.achievementId];

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.key), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.key]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="glass pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/30">
        <Award className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.18em] text-gold uppercase">
          {t.lesson.complete.achievementsUnlocked}
        </p>
        <p className="truncate text-sm font-medium">{copy.title}</p>
        <p className="truncate text-xs text-mist-400">{copy.description}</p>
      </div>
    </motion.div>
  );
}
