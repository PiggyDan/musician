"use client";

import { useSyncExternalStore } from "react";
import { useProgressStore } from "./progress";
import { useSettingsStore } from "./settings";

const persisted = [useProgressStore.persist, useSettingsStore.persist];

function subscribe(onChange: () => void): () => void {
  const unsubscribers = persisted.map((p) => p.onFinishHydration(onChange));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

const getSnapshot = () => persisted.every((p) => p.hasHydrated());
const getServerSnapshot = () => false;

/**
 * True once saved progress and settings have been read from localStorage.
 * Use it to avoid flashing default values (0 XP) before real data loads.
 */
export function useStoresHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads persisted state. Called once on mount and when another tab writes. */
export function rehydrateStores(): Promise<void> {
  return Promise.all(persisted.map((p) => p.rehydrate())).then(() => undefined);
}
