"use client";

// features/unified-data/table-page/heldArchiveStore.ts — where a synced table's held-archive question lives between the
// header bars that know it (Notion, Airtable/GitHub, the synced-table bar) and the ONE strip above the grid that asks it.
// A bar publishes its offer every render and withdraws it on unmount; nothing renders here.
import { useEffect, useId, useSyncExternalStore } from "react";

export interface HeldOffer {
  /** Who no longer lists the rows ("Notion", "The sheet"). */
  source: string;
  held: number;
  /** The exact confirmation for those rows. */
  confirm: string;
  /** The person already answered Keep to exactly these rows. */
  kept: boolean;
  /** With a changed count under an Archive click: the count it was. */
  was?: number | null;
  busy: boolean;
  onArchive: () => void;
  onKeep: () => void;
}

const offers = new Map<string, Map<string, HeldOffer>>();
const reopened = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function publishHeld(tableId: string, owner: string, offer: HeldOffer | null): void {
  const mine = offers.get(tableId) ?? new Map<string, HeldOffer>();
  if (offer) mine.set(owner, offer);
  else mine.delete(owner);
  if (mine.size) offers.set(tableId, mine);
  else offers.delete(tableId);
  emit();
}

/** The "N kept" chip: ask the question again. */
export function reopenHeld(tableId: string): void {
  reopened.add(tableId);
  emit();
}
/** Keep pressed again (or the hold gone): the chip is all that remains. */
export function closeHeld(tableId: string): void {
  if (reopened.delete(tableId)) emit();
}

/** The offer the strip draws, or null: no hold, or it was kept and nobody reopened it. */
export function visibleOffer(offer: HeldOffer | null, isReopened: boolean): HeldOffer | null {
  return offer && (!offer.kept || isReopened) ? offer : null;
}

/** The offer a bar published for this table (before the strip decides whether to draw it). */
export const currentHeld = (tableId: string): HeldOffer | null => offers.get(tableId)?.values().next().value ?? null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useHeldOffer(tableId: string): HeldOffer | null {
  const offer = useSyncExternalStore(subscribe, () => currentHeld(tableId), () => null);
  const open = useSyncExternalStore(subscribe, () => reopened.has(tableId), () => false);
  return visibleOffer(offer, open);
}

/** A bar's side: publish this render's offer (null when nothing is held) for the strip above the grid. */
export function usePublishHeld(tableId: string, offer: HeldOffer | null): void {
  const owner = useId();
  useEffect(() => {
    publishHeld(tableId, owner, offer);
  });
  useEffect(() => () => publishHeld(tableId, owner, null), [tableId, owner]);
}
