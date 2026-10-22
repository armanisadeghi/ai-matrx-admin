"use client";

/**
 * A snapshot-history tab belongs to ONE open document (or workbook). The tab is keyed by the subject's id, so
 * navigating from doc1 to doc2 in the same tab used to leave doc1's versions and Restore buttons up under a
 * generic title (adversarial walk 3 O2) — Restore there acts on a document nobody is looking at.
 *
 * The editor that owns the History button registers its subject here while it is mounted (`useHistorySubject`)
 * and, when it goes away, takes that subject's history tab down with it. The tab's body asks the same registry
 * (`useIsHistorySubjectOpen`) so a tab that outlives its editor (a restored canvas, a race) shows a notice
 * instead of Restore buttons, and Restore re-checks (`isHistorySubjectOpen`) at the moment it is pressed.
 */

import { useEffect, useSyncExternalStore } from "react";
import { canvasItemId } from "@ai-matrx/canvas";
import { useOptionalCanvas } from "@ai-matrx/canvas/react";

const open = new Map<string, number>();
const listeners = new Set<() => void>();
const keyOf = (kind: string, id: string) => `${kind}::${id}`;
const emit = () => listeners.forEach((l) => l());

export function isHistorySubjectOpen(kind: string, id: string): boolean {
  return (open.get(keyOf(kind, id)) ?? 0) > 0;
}

/** The editor of `id` is mounted: its history may show; on unmount its history tab closes. */
export function useHistorySubject(kind: string, id: string | null | undefined): void {
  const canvas = useOptionalCanvas();
  useEffect(() => {
    if (!id) return undefined;
    const key = keyOf(kind, id);
    open.set(key, (open.get(key) ?? 0) + 1);
    emit();
    return () => {
      const left = (open.get(key) ?? 1) - 1;
      if (left > 0) open.set(key, left);
      else open.delete(key);
      emit();
      // another editor of the same subject (a remount) keeps the tab; the last one out closes it
      if (left <= 0 && canvas) {
        const itemId = canvasItemId(kind, id);
        if (canvas.getState().items[itemId]) canvas.close(itemId);
      }
    };
  }, [canvas, kind, id]);
}

/** True while the editor of this subject is mounted. */
export function useIsHistorySubjectOpen(kind: string, id: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => isHistorySubjectOpen(kind, id),
    () => false,
  );
}
