"use client";

import { Flame, Target } from "lucide-react";
import { useToday } from "@/hooks/use-today";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { currentStreak, dateKey, GOAL_OPTIONS, recentDays } from "@/lib/gamification/practice";
import { useStoresHydrated } from "@/store/hydration";
import { useProgressStore } from "@/store/progress";
import { LevelRing } from "@/components/ui/progress";

/** Today's practice minutes against the daily goal, the streak, and the last two weeks. */
export function DailyGoalCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, tag } = useI18n();
  const p = t.practice;
  const hydrated = useStoresHydrated();
  const today = useToday();
  const goal = useProgressStore((s) => s.dailyGoalMinutes);
  const minutes = useProgressStore((s) => s.practiceMinutes);
  const best = useProgressStore((s) => s.bestStreak);
  const setGoal = useProgressStore((s) => s.setDailyGoal);

  if (!hydrated || !today) {
    return <div className={cn("glass skeleton min-h-48 rounded-[28px]", className)} aria-hidden />;
  }

  const todayMinutes = minutes[dateKey(today)] ?? 0;
  const streak = currentStreak(minutes, goal, today);
  const met = todayMinutes >= goal;
  const days = recentDays(minutes, today);
  const weekday = new Intl.DateTimeFormat(tag, { weekday: "narrow" });

  return (
    <section className={cn("glass flex flex-col gap-5 rounded-[28px] p-6", className)} aria-labelledby="goal-title">
      <div className="flex items-center gap-5">
        <LevelRing level={todayMinutes} progress={todayMinutes / goal} size={96} label={p.ringLabel} />
        <div className="min-w-0">
          <h2 id="goal-title" className="flex items-center gap-2 font-medium">
            <Target className="size-4 text-ion" aria-hidden />
            {p.goalTitle}
          </h2>
          <p className={cn("mt-1 text-sm", met ? "text-success" : "text-mist-200")} role="status">
            {met ? p.goalMet : format(p.minutesToday, { n: todayMinutes, goal })}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 font-mono text-xs text-warn ring-1 ring-warn/25">
            <Flame className="size-3.5" aria-hidden />
            {streak > 0 ? format(p.streak, { n: streak }) : p.streakNone}
          </p>
        </div>
      </div>

      {!compact && (
        <div>
          <p className="text-xs text-mist-500">{p.last14}</p>
          <div className="mt-2 flex h-14 items-end gap-1" role="img" aria-label={days.map((d) => `${d.key}: ${d.minutes}`).join(", ")}>
            {days.map((d) => {
              const [y, m, day] = d.key.split("-").map(Number);
              const hit = d.minutes >= goal;
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={cn("w-full rounded-sm", hit ? "bg-spectrum" : d.minutes > 0 ? "bg-white/25" : "bg-white/[0.06]")}
                    style={{ height: `${Math.max(8, Math.min(1, d.minutes / Math.max(goal, 1)) * 100)}%` }}
                  />
                  <span className="font-mono text-[9px] text-mist-500">{weekday.format(new Date(y, m - 1, day, 12))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={p.setGoal} className="flex rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={goal === option}
              onClick={() => setGoal(option)}
              className={cn(
                "h-7 rounded-full px-2.5 font-mono text-xs transition-colors",
                goal === option ? "bg-white/[0.12] text-mist-50" : "text-mist-400 hover:text-mist-50",
              )}
            >
              {format(p.minutes, { n: option })}
            </button>
          ))}
        </div>
        {best > 0 && <span className="font-mono text-xs text-mist-500">{format(p.best, { n: best })}</span>}
      </div>
      {!compact && <p className="text-xs leading-relaxed text-mist-500">{p.explain}</p>}
    </section>
  );
}
