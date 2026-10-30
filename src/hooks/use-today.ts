"use client";

import { useSyncExternalStore } from "react";
import { dateKey } from "@/lib/gamification/practice";

function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

const getSnapshot = () => dateKey(new Date());
const getServerSnapshot = () => "";

/**
 * Today's local date (noon, to be DST-safe), updating when the day changes.
 * Null during server rendering — the current date is a per-visitor value.
 */
export function useToday(): Date | null {
  const key = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
