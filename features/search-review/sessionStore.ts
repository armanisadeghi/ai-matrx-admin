"use client";

/**
 * Live review sessions. A window's overlay data must be JSON, so the session (which carries the
 * `onAnswer` function) lives here and only its id rides in the overlay data and the URL
 * (`?panels=search_review:<sessionId>`). The host re-publishes on every render, so the panel always
 * shows the host's current answers; when the host unmounts, the session is withdrawn and an open
 * panel says so instead of answering into nothing.
 */

import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { SearchReviewSession } from "./types";

const sessions = new Map<string, SearchReviewSession>();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function publishSearchReviewSession(id: string, session: SearchReviewSession): void {
  if (sessions.get(id) === session) return;
  sessions.set(id, session);
  emit();
}

export function withdrawSearchReviewSession(id: string): void {
  if (sessions.delete(id)) emit();
}

export function getSearchReviewSession(id: string | null | undefined): SearchReviewSession | null {
  return id ? (sessions.get(id) ?? null) : null;
}

/** The panel's read: re-renders whenever the host publishes. */
export function useSearchReviewSession(id: string | null | undefined): SearchReviewSession | null {
  return useSyncExternalStore(
    subscribe,
    () => getSearchReviewSession(id),
    () => null,
  );
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The host's side: a stable session id, re-published every render, withdrawn on unmount.
 * Returns the id to pass to the opener.
 */
export function usePublishSearchReviewSession(session: SearchReviewSession | null): string {
  const [id] = useState(() => `sr-${crypto.randomUUID()}`);
  useIsoLayoutEffect(() => {
    if (session) publishSearchReviewSession(id, session);
    else withdrawSearchReviewSession(id);
  });
  useEffect(() => () => withdrawSearchReviewSession(id), [id]);
  return id;
}
