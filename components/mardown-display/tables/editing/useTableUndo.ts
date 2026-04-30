"use client";

import { useCallback, useRef } from "react";

/**
 * One-level undo helper for table edits.
 *
 * Snapshot the current state immediately before a destructive mutation,
 * then pass `consume()` to a toast undo action. `consume()` returns the
 * snapshot once and clears it (so a stale undo button can't restore an
 * outdated snapshot after another mutation has happened).
 *
 * Usage:
 *   const undo = useTableUndo<TableShape>();
 *   const handleDelete = () => {
 *     undo.snapshot(currentTable);
 *     setTable(removeRow(currentTable, idx));
 *     toast.success("Row deleted", {
 *       action: { label: "Undo", onClick: () => {
 *         const prev = undo.consume();
 *         if (prev) setTable(prev);
 *       }}
 *     });
 *   };
 */
export function useTableUndo<T>() {
  const snapshotRef = useRef<T | null>(null);

  const snapshot = useCallback((current: T): void => {
    snapshotRef.current = current;
  }, []);

  const consume = useCallback((): T | null => {
    const value = snapshotRef.current;
    snapshotRef.current = null;
    return value;
  }, []);

  return { snapshot, consume };
}
