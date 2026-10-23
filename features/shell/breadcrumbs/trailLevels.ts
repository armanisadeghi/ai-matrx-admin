"use client";

// features/shell/breadcrumbs/trailLevels.ts — WHAT A LAYOUT KNOWS ABOUT ITS LEVEL.
//
// The current record (current-record/currentRecord.ts) names ONE record: the page's own. A layout over
// a deeper tree — the brand workspace under /marketing/brands/<brand>/… — knows the record at ITS level
// while the page below it shows another (a social account, a site). Without this, every derived trail
// below the layout named that level by its address ("1 Omaha Movers 2" for the brand key
// `1-omaha-movers-2`). A layout declares its level here once, keyed by the level's address; every
// derived trail on the page (`useDerivedTrail`) reads it as that level's record — name and siblings.
//
// A declaration lives exactly as long as the component that made it (unmount = gone). One module store,
// read with useSyncExternalStore (the currentRecord pattern) — no provider needed.

import { useEffect, useSyncExternalStore } from "react";
import type { TrailRecord } from "./derive-trail";

type Levels = Readonly<Record<string, TrailRecord>>;

const declarations: Array<{ key: number; href: string; record: TrailRecord }> = [];
const listeners = new Set<() => void>();
let snapshot: Levels = {};
let nextKey = 0;

function recompute(): void {
  const next: Record<string, TrailRecord> = {};
  // Newest declaration of an address wins, field by field.
  for (const { href, record } of declarations) next[href] = { ...next[href], ...record };
  snapshot = next;
  for (const listener of listeners) listener();
}

/** Declare what is known about the level at `href`; returns the release. Prefer the hook. */
export function declareTrailLevel(href: string, record: TrailRecord): () => void {
  const key = nextKey++;
  declarations.push({ key, href, record });
  recompute();
  return () => {
    const at = declarations.findIndex((d) => d.key === key);
    if (at !== -1) declarations.splice(at, 1);
    recompute();
  };
}

export function peekTrailLevels(): Levels {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: Levels = {};

/** Every level a layout declared, keyed by its address. */
export function useTrailLevels(): Levels {
  return useSyncExternalStore(subscribe, peekTrailLevels, () => EMPTY);
}

/** Declare the level at `href` (its record's name, token, siblings) for as long as the caller is mounted. */
export function useDeclareTrailLevel(href: string | null, record: TrailRecord | null): void {
  const label = record?.label ?? null;
  const token = record?.token ?? null;
  const options = record?.options;
  const optionsLabel = record?.optionsLabel;
  useEffect(() => {
    if (!href || (!label && !options)) return;
    return declareTrailLevel(href, {
      ...(label ? { label } : {}),
      ...(token ? { token } : {}),
      ...(options ? { options } : {}),
      ...(optionsLabel ? { optionsLabel } : {}),
    });
  }, [href, label, token, options, optionsLabel]);
}
