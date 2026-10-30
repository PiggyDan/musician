import type { StateStorage } from "zustand/middleware";

/**
 * localStorage that never throws: private browsing, disabled storage and
 * quota errors degrade to in-memory progress instead of crashing the app.
 */
export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Storage unavailable — progress lives for this session only.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore.
    }
  },
};
