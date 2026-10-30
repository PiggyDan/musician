"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  label,
  className,
}: {
  /** 0–1 */
  value: number;
  label: string;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-2 overflow-hidden rounded-full bg-white/[0.07]", className)}
    >
      <motion.div
        className="bg-spectrum h-full rounded-full shadow-[0_0_12px_rgba(79,139,255,0.7)]"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/** Circular level indicator: the ring fills toward the next level. */
export function LevelRing({
  level,
  progress,
  size = 112,
  label,
}: {
  level: number;
  progress: number;
  size?: number;
  label: string;
}) {
  const id = useId();
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6a55ff" />
            <stop offset="0.6" stopColor="#4f8bff" />
            <stop offset="1" stopColor="#2fd8ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: "drop-shadow(0 0 6px rgb(79 139 255 / 0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[10px] tracking-[0.2em] text-mist-400 uppercase">{label}</span>
        <span className="font-display text-3xl leading-none font-medium">{level}</span>
      </div>
    </div>
  );
}
