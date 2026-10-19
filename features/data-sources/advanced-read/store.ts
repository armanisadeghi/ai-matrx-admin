"use client";

/**
 * The advanced reads, held OUTSIDE any component: a page row that unmounts (a list re-sorts, the
 * person changes tab) and comes back re-attaches to the same read by its address. The read itself
 * keeps going and still calls the host's `onItem` (a research source saves its text) after the row left.
 */

import { useSyncExternalStore } from "react";

import { AdvancedReadRefusal, type AdvancedAllow, type AdvancedItem } from "./contract";
import { runAdvancedRead } from "./server";

export type ReadEntry = { status: "running" } | { status: "done"; item: AdvancedItem } | { status: "failed"; message: string };

const entries = new Map<string, ReadEntry>();
const listeners = new Set<() => void>();
let version = 0;

function put(url: string, entry: ReadEntry | null) {
  if (entry) entries.set(url, entry);
  else entries.delete(url);
  version += 1;
  listeners.forEach((l) => l());
}

/**
 * The entry for a page. `version` is the value `useReadVersion()` returned in the calling component:
 * passing it makes it a real input, so the React Compiler re-reads when a read changes instead of
 * reusing a stale answer (an unused hook result is dropped as a dependency: batch rows stayed "Failed").
 */
export const readEntry = (url: string, version?: number): ReadEntry | undefined => (void version, entries.get(url));

/** The state of one page's advanced read (undefined = never tried). */
export function useReadEntry(url: string): ReadEntry | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => entries.get(url),
    () => undefined,
  );
}

/** Re-render when any read changes (a batch's own tally). */
export function useReadVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
}

export function clearRead(url: string) {
  put(url, null);
}

const DROPPED = "The connection dropped before this page answered. Try again.";

/** Start reading `urls` (those already running are skipped). Never throws: every failure lands on the page it hit. */
export function startAdvancedRead(opts: {
  organizationId: string;
  urls: string[];
  allow: AdvancedAllow;
  /** Called once per page as it lands, even when the row that asked is gone. */
  onItem?: (item: AdvancedItem) => void;
}): void {
  const urls = [...new Set(opts.urls)].filter((u) => entries.get(u)?.status !== "running");
  if (urls.length === 0) return;
  urls.forEach((u) => put(u, { status: "running" }));
  const pending = new Set(urls);
  const settle = (item: AdvancedItem) => {
    pending.delete(item.url);
    put(item.url, { status: "done", item });
    opts.onItem?.(item);
  };
  runAdvancedRead({ organizationId: opts.organizationId, urls, allow: opts.allow, onItem: settle })
    .then(() => pending.forEach((u) => put(u, { status: "failed", message: "The advanced reader gave no answer for this page." })))
    .catch((err: unknown) => {
      const message = err instanceof AdvancedReadRefusal ? err.message : DROPPED;
      pending.forEach((u) => put(u, { status: "failed", message }));
    });
}
