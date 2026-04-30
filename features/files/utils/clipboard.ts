/**
 * features/files/utils/clipboard.ts
 *
 * Tiny in-memory clipboard for the cloud-files cut / copy / paste flow.
 * Holds a single set of references plus the intended op; consumers
 * subscribe via `useFileClipboard()` and trigger operations through
 * `cut()` / `copy()` / `paste()` / `clear()`.
 *
 * State is intentionally module-level (not Redux) — the clipboard is
 * session-scoped, doesn't need devtools, and doesn't need to survive
 * reloads. Keeping it out of the slice avoids reducer churn for every
 * keystroke-rate selection change. Subscribers use React's
 * `useSyncExternalStore` so renders stay coherent across surfaces.
 *
 * Semantics:
 *   - `cut` marks the selection for *move* on next paste. The source
 *     rows render with reduced opacity until paste / clear / new cut.
 *   - `copy` marks the selection for *duplicate*. Files duplicate
 *     server-side (re-upload). Folder duplicate isn't supported by the
 *     backend yet — paste falls back to a no-op + a toast.
 *   - `paste` runs the marked op against the current active folder
 *     (or a caller-supplied target).
 */

import { useSyncExternalStore } from "react";

export type ClipboardOp = "cut" | "copy";

export interface ClipboardItem {
  id: string;
  /** Whether the id is a real cloud-file/-folder or a virtual-source row.
   *  Useful so the consumer can decide which thunk to call without an
   *  extra Redux read. */
  source: "real" | "virtual";
  kind: "file" | "folder";
}

export interface ClipboardState {
  op: ClipboardOp;
  items: ClipboardItem[];
  /** Wall-clock when the selection was placed on the clipboard. */
  setAt: number;
}

let state: ClipboardState | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function getClipboard(): ClipboardState | null {
  return state;
}

export function setClipboard(next: ClipboardState | null): void {
  state = next;
  emit();
}

export function clearClipboard(): void {
  if (state === null) return;
  state = null;
  emit();
}

/** Subscribe to clipboard changes — for `useSyncExternalStore`. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): ClipboardState | null {
  return null;
}

/**
 * React hook — re-renders when the clipboard changes. Returns the
 * current state (null when empty) plus convenience helpers.
 */
export function useFileClipboard(): {
  clipboard: ClipboardState | null;
  cut: (items: ClipboardItem[]) => void;
  copy: (items: ClipboardItem[]) => void;
  clear: () => void;
  isCutItem: (id: string) => boolean;
  isCopiedItem: (id: string) => boolean;
} {
  const clipboard = useSyncExternalStore(
    subscribe,
    getClipboard,
    getServerSnapshot,
  );

  return {
    clipboard,
    cut: (items) =>
      setClipboard({ op: "cut", items, setAt: Date.now() }),
    copy: (items) =>
      setClipboard({ op: "copy", items, setAt: Date.now() }),
    clear: clearClipboard,
    isCutItem: (id) =>
      clipboard?.op === "cut" && clipboard.items.some((i) => i.id === id),
    isCopiedItem: (id) =>
      clipboard?.op === "copy" && clipboard.items.some((i) => i.id === id),
  };
}
