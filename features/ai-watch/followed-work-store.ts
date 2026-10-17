/**
 * What the poller learned about each followed work item (`followed-work-resolve.ts`): its AI call
 * identities (user_request ids, conversation ids), its steps with inputs/outputs, and whether it
 * is over. One store, read by Watch AI's rail and the Builder feed — never read twice.
 */

import { useSyncExternalStore } from "react";
import type { Resolved } from "./followed-work-resolve";

let byKey: Readonly<Record<string, Resolved>> = {};
const listeners = new Set<() => void>();

export function setResolved(key: string, value: Resolved): void {
  byKey = { ...byKey, [key]: value };
  for (const fn of listeners) fn();
}

export function getResolved(): Readonly<Record<string, Resolved>> {
  return byKey;
}

export function useResolvedFollowed(): Readonly<Record<string, Resolved>> {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getResolved,
    () => ({}) as Readonly<Record<string, Resolved>>,
  );
}

export function resetResolved(): void {
  byKey = {};
  for (const fn of listeners) fn();
}

// The recorded AI calls of all followed work (rows of chat.user_request, tagged with the work).
import type { AiWatchRunSummary } from "./ai-watch-records";

let runs: readonly AiWatchRunSummary[] = [];
const runListeners = new Set<() => void>();

export function setFollowedRuns(next: readonly AiWatchRunSummary[]): void {
  runs = next;
  for (const fn of runListeners) fn();
}

export function useFollowedRunSummaries(): readonly AiWatchRunSummary[] {
  return useSyncExternalStore(
    (fn) => {
      runListeners.add(fn);
      return () => runListeners.delete(fn);
    },
    () => runs,
    () => [] as readonly AiWatchRunSummary[],
  );
}
