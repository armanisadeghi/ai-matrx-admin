"use client";

/**
 * "Last opened by me" for workbooks and documents.
 *
 * ONE STORE: `platform.user_entity_state.last_viewed_at`, written by `public.ues_touch`
 * (→ `platform.record_view`, the platform's recently-opened door) and read by `ues_list` — the same
 * per-person table stars use (`useFileFavorites`). The editor routes call `useRecordOpened` once per
 * open; the homes read the map. One module cache per entity type, so a home rendered after an open
 * already knows it.
 */

import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import type { FileEntityType } from "../useFileFavorites";

type Store = {
  opened: ReadonlyMap<string, string>;
  loaded: boolean;
  loading: Promise<void> | null;
  error: string | null;
  listeners: Set<() => void>;
};

const stores = new Map<FileEntityType, Store>();

function storeFor(type: FileEntityType): Store {
  let s = stores.get(type);
  if (!s) {
    s = { opened: new Map(), loaded: false, loading: null, error: null, listeners: new Set() };
    stores.set(type, s);
  }
  return s;
}

function emit(s: Store, opened: ReadonlyMap<string, string>) {
  s.opened = opened;
  for (const l of s.listeners) l();
}

function load(type: FileEntityType, force = false): Promise<void> {
  const s = storeFor(type);
  if (s.loaded && !force) return Promise.resolve();
  if (s.loading) return s.loading;
  s.loading = (async () => {
    // Filter on the server: the unfiltered list is every row a person has ever touched (thousands for a
    // busy account) and PostgREST's row cap would cut it before any workbook or document appears.
    const { data, error } = await createClient()
      .rpc("ues_list", {})
      .eq("entity_type", type)
      .not("last_viewed_at", "is", null)
      .order("last_viewed_at", { ascending: false })
      .limit(1000);
    s.loading = null;
    if (error) {
      s.error = error.message;
      console.error("[useRecordsOpened] ues_list failed", error);
      emit(s, s.opened);
      return;
    }
    s.loaded = true;
    s.error = null;
    const next = new Map<string, string>();
    for (const r of data ?? []) {
      if (r.entity_type === type && r.last_viewed_at) next.set(r.entity_id, r.last_viewed_at);
    }
    emit(s, next);
  })();
  return s.loading;
}

/** The person's last-open time per record id of one type (ISO strings). */
export function useRecordsOpened(type: FileEntityType): { opened: ReadonlyMap<string, string>; error: string | null } {
  const s = storeFor(type);
  const opened = useSyncExternalStore(
    (l) => {
      s.listeners.add(l);
      return () => s.listeners.delete(l);
    },
    () => s.opened,
    () => s.opened,
  );
  useEffect(() => {
    // Always re-read on mount: another tab may have opened files since.
    void load(type, true);
  }, [type]);
  return { opened, error: s.error };
}

/** Record that this person opened the record (once per mount of an editor route). */
export function useRecordOpened(type: FileEntityType, id: string | null | undefined): void {
  useEffect(() => {
    if (!id) return;
    const s = storeFor(type);
    const next = new Map(s.opened);
    next.set(id, new Date().toISOString());
    emit(s, next);
    void createClient()
      .rpc("ues_touch", { p_entity_type: type, p_entity_id: id })
      .then(({ error }) => {
        // A refused open (the record is not theirs to open) is not this hook's to announce — the
        // editor already says so. Anything else is a real failure of the recent list.
        if (error && error.code !== "42501") console.error("[useRecordOpened] ues_touch failed", error);
      });
  }, [type, id]);
}
