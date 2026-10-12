"use client";

/**
 * The first-page / first-sheet preview of a recent file, for `RecordThumb`.
 *
 * ONE READ: `workbench.file_previews(kind, ids)` returns a SMALL slice of each record's latest
 * snapshot (first 30 rows x 12 columns of the first sheet; the first 2,000 characters and 60
 * paragraph styles of a document) under the caller's own row security — never the whole snapshot
 * (a workbook's can be megabytes). Cards ask only once they scroll near the screen; asks made in the
 * same moment travel in one call. Cached per record AND its `updated_at`, so an edited file
 * refreshes and an unchanged one never asks twice in a session.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";

export type PreviewKind = "workbook" | "document";

export interface SheetPreviewCell {
  v?: string | number | boolean | null;
  /** bold */
  b?: number;
  /** background / text colour, as stored in the sheet */
  bg?: string;
  cl?: string;
  /** horizontal alignment (Univer: 1 left, 2 center, 3 right) */
  ht?: number;
  /** number-format pattern */
  n?: string;
}

export interface SheetPreview {
  sheet?: string;
  defaultWidth?: number;
  cols?: Record<string, { w?: number; h?: number }>;
  cells?: Record<string, Record<string, SheetPreviewCell>>;
}

export interface DocPreview {
  text?: string;
  /** i: the paragraph's end index in the data stream; n: named style; a: alignment; l: list type */
  paras?: Array<{ i?: number; n?: number | string; a?: number; l?: string }>;
}

type Entry =
  | { state: "loading" }
  | { state: "ready"; preview: SheetPreview | DocPreview }
  /** The record has no saved content yet — a blank page / grid is the truth. */
  | { state: "empty" }
  | { state: "error"; error: string };

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const LOADING: Entry = { state: "loading" };

function notify() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const queue = new Map<PreviewKind, Map<string, string>>(); // kind → id → cache key
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH = 40;

function keyOf(kind: PreviewKind, id: string, stamp: string) {
  return `${kind}:${id}:${stamp}`;
}

async function flush() {
  flushTimer = null;
  const jobs = [...queue.entries()];
  queue.clear();
  for (const [kind, ids] of jobs) {
    const all = [...ids.entries()];
    for (let i = 0; i < all.length; i += BATCH) {
      const chunk = all.slice(i, i + BATCH);
      const { data, error } = await createClient()
        .schema("workbench")
        .rpc("file_previews", { p_kind: kind, p_ids: chunk.map(([id]) => id) });
      const byId = new Map((data ?? []).map((r) => [r.id, r.preview]));
      for (const [id, key] of chunk) {
        if (error) cache.set(key, { state: "error", error: error.message });
        else {
          const preview = byId.get(id);
          cache.set(key, preview && typeof preview === "object" ? { state: "ready", preview: preview as SheetPreview | DocPreview } : { state: "empty" });
        }
      }
      if (error) console.error("[RecordThumb] file_previews failed", error);
      notify();
    }
  }
}

function request(kind: PreviewKind, id: string, stamp: string) {
  const key = keyOf(kind, id, stamp);
  if (cache.has(key)) return;
  cache.set(key, LOADING);
  let ids = queue.get(kind);
  if (!ids) {
    ids = new Map();
    queue.set(kind, ids);
  }
  ids.set(id, key);
  if (!flushTimer) flushTimer = setTimeout(() => void flush(), 30);
}

/**
 * The preview of one record, asked for only once `ref` is within a screen of the viewport.
 * `stamp` is the record's `updated_at`: a new stamp is a new preview.
 */
export function useRecordPreview(kind: PreviewKind, id: string, stamp: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const key = keyOf(kind, id, stamp);
  // The entry itself is the store snapshot (each change stores a NEW entry object), so the React
  // Compiler never serves a memoized read of the module cache.
  const entry = useSyncExternalStore(subscribe, () => cache.get(key) ?? LOADING, () => LOADING);

  useEffect(() => {
    if (cache.has(key)) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      request(kind, id, stamp);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          request(kind, id, stamp);
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [kind, id, stamp, key]);

  return { ref, entry };
}
