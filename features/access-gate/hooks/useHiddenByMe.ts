"use client";

/**
 * Hooks over THE per-person hide (`features/access-gate/service/hiddenByMe.ts`).
 *
 * The hidden ids live in ONE small module store per token (no React Query): the
 * list shell (`lib/entity-list`) reads them, and it renders in hosts and tests
 * that have no query client. Hide/unhide refresh the store, so every list of
 * that kind re-renders at once.
 *
 * `useHiddenByMe(token)`   — the person's hidden ids for one record type.
 * `useHiddenItems(token)`  — the same, with the names they saw (for the panel).
 * `useHideForMe(token)`    — hide / unhide; `onChanged` re-reads a list that
 *                            narrows server-side (Marketing › Brands).
 * `useRemovalRights(token, id)` — the pre-check run BEFORE an archive/delete
 *                            confirm (app surfaces only; React Query).
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchRemovalRights,
  hideForMe,
  listHiddenItems,
  unhideForMe,
  type HiddenItem,
} from "@/features/access-gate/service/hiddenByMe";

interface Slot {
  items: HiddenItem[] | undefined;
  loading: Promise<void> | null;
}

const slots = new Map<string, Slot>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function slotFor(token: string): Slot {
  let slot = slots.get(token);
  if (!slot) {
    slot = { items: undefined, loading: null };
    slots.set(token, slot);
  }
  return slot;
}

/** (Re)read one token's hidden items into the store. */
export function refreshHiddenByMe(token: string): Promise<void> {
  const slot = slotFor(token);
  const loading = listHiddenItems(token)
    .then((items) => {
      slot.items = items;
    })
    .catch(() => {
      // An unreadable answer hides nothing: the list stays whole, never wrongly short.
      slot.items = slot.items ?? [];
    })
    .finally(() => {
      slot.loading = null;
      emit();
    });
  slot.loading = loading;
  return loading;
}

function useHiddenSlot(token: string, enabled: boolean): HiddenItem[] | undefined {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => version,
  );
  const active = enabled && Boolean(token);
  const slot = active ? slotFor(token) : undefined;
  useEffect(() => {
    if (!active) return;
    const current = slotFor(token);
    if (current.items === undefined && !current.loading) void refreshHiddenByMe(token);
  }, [active, token]);
  return slot?.items;
}

export function useHiddenByMe(token: string, enabled = true) {
  const items = useHiddenSlot(token, enabled);
  return {
    data: items?.map((item) => item.id),
    isPending: enabled && Boolean(token) && items === undefined,
  };
}

export function useHiddenItems(token: string, enabled = true) {
  const items = useHiddenSlot(token, enabled);
  return { data: items, isPending: enabled && items === undefined };
}

export function useRemovalRights(token: string, id: string | null) {
  return useQuery({
    queryKey: ["hidden-by-me", "rights", token, id ?? ""] as const,
    queryFn: () => fetchRemovalRights(token, id as string),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

type HideArgs = string | { id: string; label?: string | null };

/** Hide / unhide for the person. `onChanged` runs after the store refreshed. */
export function useHideForMe(token: string, onChanged?: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
      await refreshHiddenByMe(token);
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };
  return {
    hide: {
      isPending: busy,
      mutateAsync: (args: HideArgs) =>
        run(() =>
          typeof args === "string" ? hideForMe(token, args) : hideForMe(token, args.id, args.label),
        ),
    },
    unhide: {
      isPending: busy,
      mutateAsync: (id: string) => run(() => unhideForMe(token, id)),
    },
  };
}
