"use client";

// features/messaging/lib/conversationSelection.ts — the /messages list's multi-select.
//
// The conversation ROWS belong to `@ai-matrx/messaging` (its list, inside the provider's
// `wrapConversationRow` chrome), so the ticks live in a tiny store both the row chrome (a checkbox while
// selecting) and the pane (the bar with the bulk verbs) read. Selecting is a MODE the person turns on with
// the pane's Select button; while it is on, a click on a row ticks it instead of opening the thread.

import { useSyncExternalStore } from "react";
import type { RowSelection } from "@/lib/entity-list/RowSelectionBar";

interface State {
  selecting: boolean;
  ids: ReadonlySet<string>;
}

let state: State = { selecting: false, ids: new Set() };
const listeners = new Set<() => void>();

function set(next: State): void {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConversationSelectionState(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function setSelecting(on: boolean): void {
  set({ selecting: on, ids: new Set() });
}

export function toggleConversation(id: string): void {
  const ids = new Set(state.ids);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  set({ ...state, ids });
}

/** A `RowSelection` over the rows in hand: ticks on rows that left the list drop out. */
export function useConversationRowSelection<TRow>(rows: readonly TRow[], idOf: (row: TRow) => string): RowSelection<TRow> {
  const { ids } = useConversationSelectionState();
  const onScreen = new Set(rows.map(idOf));
  const selectedRows = rows.filter((row) => ids.has(idOf(row)));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  return {
    rows: selectedRows,
    has: (id) => ids.has(id) && onScreen.has(id),
    toggle: toggleConversation,
    toggleAll: () => set({ ...state, ids: allSelected ? new Set() : new Set(rows.map(idOf)) }),
    setMany: (many, ticked) => {
      const next = new Set(state.ids);
      for (const id of many) {
        if (ticked) next.add(id);
        else next.delete(id);
      }
      set({ ...state, ids: next });
    },
    clear: () => set({ ...state, ids: new Set() }),
    allSelected,
    someSelected: selectedRows.length > 0 && !allSelected,
  };
}
