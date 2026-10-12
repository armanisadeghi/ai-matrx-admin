"use client";

/**
 * THE ROWS TICKED ON A TABLE PAGE, for the header's "From live data" dialog.
 *
 * The grid tells the page's grid-context channel what is ticked (`GridContextSnapshot.selectedRows`);
 * the channel publishes the ids here, keyed by table, so the dialog (which lives in the route
 * header, outside the table) can offer "Selected rows". Nothing is stored beyond the page.
 */

import { useSyncExternalStore } from "react";

const EMPTY: readonly string[] = Object.freeze([]);
const byTable = new Map<string, readonly string[]>();
const listeners = new Set<() => void>();

export function publishSelectedRows(tableId: string, ids: readonly string[]): void {
  const before = byTable.get(tableId) ?? EMPTY;
  if (before.length === ids.length && before.every((id, i) => id === ids[i])) return;
  if (ids.length === 0) byTable.delete(tableId);
  else byTable.set(tableId, Object.freeze([...ids]));
  listeners.forEach((l) => l());
}

export function useSelectedRowIds(tableId: string): readonly string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => byTable.get(tableId) ?? EMPTY,
    () => EMPTY,
  );
}
