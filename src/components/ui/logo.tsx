import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * MusicPath mark: a single path that rises like a melody line and resolves
 * into a note head — the learning path and the music are the same line.
 */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#6a55ff" />
          <stop offset="0.55" stopColor="#4f8bff" />
          <stop offset="1" stopColor="#2fd8ee" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="39" rx="11" fill="#11111f" stroke="rgb(255 255 255 / 0.1)" />
      <path
        d="M8 29 C 13 29, 13 20, 18 20 S 23 26, 26 22 L 26 9 L 32 11"
        fill="none"
        stroke={`url(#${id}-g)`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="22.6" cy="27.4" rx="4.1" ry="3.2" transform="rotate(-22 22.6 27.4)" fill={`url(#${id}-g)`} />
      <circle cx="8" cy="29" r="2" fill="#6a55ff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[15px] font-medium tracking-tight">
        Music<span className="text-spectrum">Path</span>
      </span>
    </span>
  );
}
