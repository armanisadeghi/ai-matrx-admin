"use client";

/** Tools → Accessibility: choices that belong to this browser, kept in local storage and read by the editor and Present. */

import { useSyncExternalStore } from "react";

export interface DeckA11y {
  announceSlides: boolean;
  reduceMotion: boolean;
  /** Tools → Spelling and grammar: the browser checks spelling in slide text and notes. */
  spellcheck: boolean;
}

const KEY = "matrx.presentations.a11y";
const DEFAULT: DeckA11y = { announceSlides: true, reduceMotion: false, spellcheck: true };
const listeners = new Set<() => void>();
let cache: DeckA11y | null = null;

export function getDeckA11y(): DeckA11y {
  if (cache) return cache;
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<DeckA11y>) } : DEFAULT;
  } catch {
    cache = DEFAULT;
  }
  return cache;
}

export function setDeckA11y(next: DeckA11y): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage refused (private mode): the choice still holds for this page.
  }
  listeners.forEach((l) => l());
}

export function useDeckA11y(): DeckA11y {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getDeckA11y,
    () => DEFAULT,
  );
}
