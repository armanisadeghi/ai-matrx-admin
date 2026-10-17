// lib/boot/firstEngagement.ts — THE ENGAGEMENT TIER.
//
// Owner rule (Arman, 2026-10-16): nothing fetches until something engages with it. Work that only
// pays off once the person acts (the AI warm-up, …) waits for the page's FIRST real engagement:
// a TRUSTED pointer press, key press or touch (event.isTrusted). Focus is NEVER engagement — not
// the composer's autofocus on load, and not a focus that lands while the browser reports a live
// user activation: Playwright's page.evaluate runs as a user gesture, so under check:smoke the
// autofocus counted and Meet, the AI warm-up and the scope tree loaded at +2 s untouched. A focus a
// person causes is always preceded by its own press or key, which already counts. Idle is not
// engagement. The listeners are installed once, at module evaluation, by the deferred-singleton
// wrapper (every signed-in route's boot bundle), so an engagement before the deferred core loads is
// still seen. Once engaged, the page stays engaged for its lifetime.
"use client";

import { useSyncExternalStore } from "react";

let engaged = false;
let installed = false;
const listeners = new Set<() => void>();

function markEngaged(): void {
  if (engaged) return;
  engaged = true;
  uninstall();
  for (const l of [...listeners]) l();
}

const onPress = (event: Event) => {
  if (event.isTrusted) markEngaged();
};
function uninstall(): void {
  if (typeof window === "undefined") return;
  window.removeEventListener("pointerdown", onPress, true);
  window.removeEventListener("keydown", onPress, true);
  window.removeEventListener("touchstart", onPress, true);
}

/** Idempotent. Server: no-op. */
export function installFirstEngagementListeners(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("pointerdown", onPress, { capture: true, passive: true });
  window.addEventListener("keydown", onPress, { capture: true, passive: true });
  window.addEventListener("touchstart", onPress, { capture: true, passive: true });
}

export function hasEngaged(): boolean {
  return engaged;
}

/** Resolves on the page's first engagement (immediately when it already happened). */
export function whenEngaged(): Promise<void> {
  if (engaged) return Promise.resolve();
  installFirstEngagementListeners();
  return new Promise((resolve) => {
    const done = () => {
      listeners.delete(done);
      resolve();
    };
    listeners.add(done);
  });
}

function subscribe(cb: () => void): () => void {
  installFirstEngagementListeners();
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

/** `true` from the page's first engagement on. One re-render: false → true. */
export function useHasEngaged(): boolean {
  return useSyncExternalStore(subscribe, hasEngaged, () => false);
}

/** Tests only: stands in for a trusted gesture (jsdom events are never trusted). */
export function engageForTest(): void {
  markEngaged();
}

/** Tests only. */
export function resetFirstEngagement(): void {
  uninstall();
  engaged = false;
  installed = false;
  listeners.clear();
}
