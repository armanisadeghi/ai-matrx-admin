/**
 * The person-peek request store — tiny on purpose. `openPersonPeek` (records-ui `openPerson`) writes
 * here; `PersonPeekHost` reads it. The deferred-singleton wrapper watches `personPeekRequested` so
 * the overlay world (OverlayController + PersonPeekHost) loads on the FIRST request, never at idle.
 * No React, no Supabase, no peek UI: this module is in every signed-in route's boot bundle.
 */

export interface PersonTarget {
  recordId: string;
  userId?: string | null;
  email?: string | null;
  name?: string;
}

let current: PersonTarget | null = null;
let everRequested = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function setPersonPeekTarget(next: PersonTarget | null): void {
  current = next;
  if (next) everRequested = true;
  emit();
}

export function openPersonPeek(target: PersonTarget): void {
  setPersonPeekTarget(target);
}

export function subscribePersonPeek(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function getPersonPeekTarget(): PersonTarget | null {
  return current;
}

/** True once any person peek has been requested this page load (latches). */
export function personPeekRequested(): boolean {
  return everRequested;
}
