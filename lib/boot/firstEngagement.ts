// lib/boot/firstEngagement.ts — THE ENGAGEMENT TIER.
//
// Owner rule (Arman, 2026-10-16): nothing fetches until something engages with it. Work that only
// pays off once the person acts (the AI warm-up, …) waits for the page's FIRST real engagement:
// a pointer press, a key press, or focus landing in a text field (a composer). Idle is not
// engagement. The listeners are installed once, at module evaluation, by the deferred-singleton
// wrapper (every signed-in route's boot bundle), so an engagement before the deferred core loads is
// still seen. Once engaged, the page stays engaged for its lifetime.
"use client";

import { useSyncExternalStore } from "react";

let engaged = false;
let installed = false;
const listeners = new Set<() => void>();

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "reset", "hidden"].includes(target.type);
}

function markEngaged(): void {
  if (engaged) return;
  engaged = true;
  uninstall();
  for (const l of [...listeners]) l();
}

const onPress = () => markEngaged();
const onFocus = (event: FocusEvent) => {
  if (isTextField(event.target)) markEngaged();
};

function uninstall(): void {
  if (typeof window === "undefined") return;
  window.removeEventListener("pointerdown", onPress, true);
  window.removeEventListener("keydown", onPress, true);
  window.removeEventListener("focusin", onFocus, true);
}

/** Idempotent. Server: no-op. */
export function installFirstEngagementListeners(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("pointerdown", onPress, { capture: true, passive: true });
  window.addEventListener("keydown", onPress, { capture: true, passive: true });
  window.addEventListener("focusin", onFocus, { capture: true, passive: true });
  // A text field focused before this module evaluated (autofocus) is a composer focus.
  if (isTextField(document.activeElement)) markEngaged();
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

/** Tests only. */
export function resetFirstEngagement(): void {
  uninstall();
  engaged = false;
  installed = false;
  listeners.clear();
}
