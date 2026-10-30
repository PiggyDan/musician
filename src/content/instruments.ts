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
  { id: "guitar", available: false, accent: "#4f8bff" },
  { id: "ukulele", available: false, accent: "#2fd0e8" },
  { id: "harmonica", available: false, accent: "#6ad1b8" },
  { id: "violin", available: false, accent: "#b98bff" },
  { id: "cello", available: false, accent: "#e48bd6" },
];
