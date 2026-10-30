import type { ReactNode } from "react";
import type { InstrumentId } from "@/content/instruments";
import { cn } from "@/lib/cn";

/** Line-drawn instrument silhouettes, drawn on a 64×64 grid with a 1.6 stroke. */
const GLYPHS: Record<InstrumentId, ReactNode> = {
  piano: (
    <>
      <rect x="8" y="18" width="48" height="28" rx="4" />
      <path d="M8 30h48" />
      <path d="M16 30v16M24 30v16M32 30v16M40 30v16M48 30v16" />
      <path d="M13 30v9M21 30v9M35 30v9M43 30v9M51 30v9" strokeWidth="3.2" />
    </>
  ),
  guitar: (
    <>
      <path d="M40 24 52 12" />
      <path d="m50 10 4 4" strokeWidth="3" />
      <path d="M38 22c-4-4-11-3-13 2-1 3-4 3-7 3-6 0-10 5-10 11 0 9 9 18 18 18 6 0 11-4 11-10 0-3 0-6 3-7 5-2 6-9 2-13Z" />
      <circle cx="27" cy="37" r="4" />
      <path d="m22 42 5-5" />
    </>
  ),
  ukulele: (
    <>
      <path d="M38 26 50 14" />
      <path d="m48 12 4 4" strokeWidth="3" />
      <path d="M36 24c-3-3-8-2-9 1-1 2-3 2-5 2-5 0-8 4-8 9 0 7 6 13 13 13 5 0 9-3 9-8 0-2 0-4 2-5 4-2 4-8 1-11Z" />
      <circle cx="27" cy="37" r="3" />
    </>
  ),
  harmonica: (
    <>
      <rect x="8" y="24" width="48" height="16" rx="3" />
      <path d="M8 29h48M8 35h48" />
      <path d="M15 29v6M21 29v6M27 29v6M33 29v6M39 29v6M45 29v6M51 29v6" />
    </>
  ),
  violin: (
    <>
      <path d="M32 6v10" />
      <path d="M28 16h8l1 5c4 1 6 4 4 8-1 2-1 3 0 5 4 6 1 14-9 14s-13-8-9-14c1-2 1-3 0-5-2-4 0-7 4-8Z" />
      <path d="M29 30c1 1 1 3 0 4M35 30c-1 1-1 3 0 4" />
      <path d="M12 54 52 22" strokeWidth="1.2" />
    </>
  ),
  cello: (
    <>
      <path d="M32 4v10" />
      <path d="M27 14h10l1 6c6 2 8 6 5 11-1 2-1 3 0 5 5 8 1 18-11 18S16 44 21 36c1-2 1-3 0-5-3-5-1-9 5-11Z" />
      <path d="M32 54v6" />
      <path d="M28 31c1 1 1 3 0 4M36 31c-1 1-1 3 0 4" />
    </>
  ),
};

export function InstrumentGlyph({
  id,
  className,
  color,
}: {
  id: InstrumentId;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn("size-12", className)}
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPHS[id]}
    </svg>
  );
}
