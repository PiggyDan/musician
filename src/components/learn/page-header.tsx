"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-end justify-between gap-6"
    >
      <div className="max-w-2xl">
        <p className="eyebrow mb-4">{eyebrow}</p>
        <h1 className="font-display text-[2rem] leading-[1.1] font-medium tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-base text-mist-400 sm:text-lg">{subtitle}</p>}
      </div>
      {children}
    </motion.header>
  );
}
