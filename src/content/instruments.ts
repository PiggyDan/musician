export type InstrumentId =
  | "piano"
  | "guitar"
  | "ukulele"
  | "harmonica"
  | "violin"
  | "cello";

export interface InstrumentDefinition {
  id: InstrumentId;
  available: boolean;
  /** Route to the instrument's academy, when available. */
  href?: string;
  /** Accent hue used for the instrument's glyph and glow. */
  accent: string;
}

export const INSTRUMENTS: readonly InstrumentDefinition[] = [
  { id: "piano", available: true, href: "/learn/piano", accent: "#8b7bff" },
  { id: "guitar", available: true, href: "/learn/guitar", accent: "#4f8bff" },
  { id: "ukulele", available: true, href: "/learn/ukulele", accent: "#2fd0e8" },
  { id: "harmonica", available: true, href: "/learn/harmonica", accent: "#6ad1b8" },
  { id: "violin", available: true, href: "/learn/violin", accent: "#b98bff" },
  { id: "cello", available: true, href: "/learn/cello", accent: "#e48bd6" },
];
