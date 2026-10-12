/**
 * Undo / redo over the deck reducer (PURE). Typing into one field is ONE undo step (consecutive
 * `setField` / `setNotes` / `setTitle` on the same target coalesce), like Google Slides.
 */

import { deckReducer, type Deck, type DeckAction, type DeckState } from "./deck-model";

export type DeckHistory = {
  present: DeckState;
  past: DeckState[];
  future: DeckState[];
  /** The coalescing key of the last recorded step ("field:2:title"), null after a structural change. */
  lastKey: string | null;
  /** Bumped on every content change (autosave watches it); not on navigation. */
  revision: number;
};

export type HistoryAction =
  | DeckAction
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; index: number }
  /** A reload from the server (load / restore): history starts over. */
  | { type: "reset"; deck: Deck };

const LIMIT = 200;

function coalesceKey(a: DeckAction): string | null {
  if (a.type === "setField") return `field:${a.index}:${a.path}`;
  if (a.type === "setNotes") return `notes:${a.index}`;
  if (a.type === "setTitle") return "title";
  return null;
}

export function initialHistory(deck: Deck): DeckHistory {
  return { present: { deck, current: 0 }, past: [], future: [], lastKey: null, revision: 0 };
}

export function historyReducer(h: DeckHistory, action: HistoryAction): DeckHistory {
  switch (action.type) {
    case "reset":
      return initialHistory(action.deck);
    case "select": {
      const n = h.present.deck.slides.length;
      const index = Math.max(0, Math.min(n - 1, action.index));
      return { ...h, present: { ...h.present, current: index }, lastKey: null };
    }
    case "undo": {
      const prev = h.past[h.past.length - 1];
      if (!prev) return h;
      return {
        present: { ...prev, current: Math.min(prev.current, Math.max(0, prev.deck.slides.length - 1)) },
        past: h.past.slice(0, -1),
        future: [h.present, ...h.future],
        lastKey: null,
        revision: h.revision + 1,
      };
    }
    case "redo": {
      const next = h.future[0];
      if (!next) return h;
      return { present: next, past: [...h.past, h.present], future: h.future.slice(1), lastKey: null, revision: h.revision + 1 };
    }
    default: {
      const next = deckReducer(h.present, action);
      if (next === h.present || next.deck === h.present.deck) return next === h.present ? h : { ...h, present: next };
      const key = coalesceKey(action);
      const merge = key !== null && key === h.lastKey;
      return {
        present: next,
        past: merge ? h.past : [...h.past, h.present].slice(-LIMIT),
        future: [],
        lastKey: key,
        revision: h.revision + 1,
      };
    }
  }
}
