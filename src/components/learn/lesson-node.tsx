import { Check, Clock3, Lock, Play } from "lucide-react";
import type { LessonState } from "@/content/lessons/types";
import { cn } from "@/lib/cn";

const SIZES = { sm: "size-11", md: "size-14" } as const;

/** The circular marker for a lesson on a learning path. */
export function LessonNode({
  state,
  order,
  size = "md",
}: {
  state: LessonState;
  order: number;
  size?: keyof typeof SIZES;
}) {
  const icon = size === "sm" ? "size-4" : "size-5";
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        SIZES[size],
        state === "completed" &&
          "bg-spectrum text-white shadow-[0_0_24px_-2px_rgba(79,139,255,0.8),inset_0_1px_0_rgba(255,255,255,0.4)]",
        state === "available" &&
          "animate-pulse-ring bg-ink-800 text-ion ring-2 ring-pulse shadow-[0_0_30px_-4px_rgba(139,123,255,0.9)]",
        state === "locked" && "bg-ink-800 text-mist-500 ring-1 ring-white/10",
        state === "coming-soon" && "border border-dashed border-white/20 bg-ink-900 text-mist-500",
      )}
    >
      {state === "completed" && <Check className={icon} strokeWidth={2.6} />}
      {state === "available" && <Play className={cn(icon, "translate-x-px fill-current")} />}
      {state === "locked" && <Lock className={icon} />}
      {state === "coming-soon" && <Clock3 className={icon} />}
      <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-ink-950 font-mono text-[10px] text-mist-200 ring-1 ring-white/10">
        {order}
      </span>
    </span>
  );
}
