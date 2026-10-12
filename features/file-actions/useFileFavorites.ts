"use client";

/**
 * Stars for file-like records (workbooks, documents).
 *
 * ONE STORE: `platform.user_entity_state` through `public.ues_set` / `ues_list`
 * — the same per-person flag table organization, agent and model favorites use.
 * A star is a fact about a record, not a preference blob. One module cache per
 * entity type so every list on screen agrees the moment a star changes.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";

export type FileEntityType = "workbook" | "udt_document" | "presentation";

type Store = {
  ids: ReadonlySet<string>;
  loaded: boolean;
  loading: Promise<void> | null;
  listeners: Set<() => void>;
};

const stores = new Map<FileEntityType, Store>();

function storeFor(type: FileEntityType): Store {
  let s = stores.get(type);
  if (!s) {
    s = { ids: new Set(), loaded: false, loading: null, listeners: new Set() };
    stores.set(type, s);
  }
  return s;
}

function emit(s: Store, ids: ReadonlySet<string>) {
  s.ids = ids;
  for (const l of s.listeners) l();
}

function load(type: FileEntityType): Promise<void> {
  const s = storeFor(type);
  if (s.loaded) return Promise.resolve();
  if (s.loading) return s.loading;
  s.loading = (async () => {
    const { data, error } = await createClient().rpc("ues_list", {
      p_kind: "favorite",
    });
    s.loading = null;
    if (error) {
      console.error("[useFileFavorites] ues_list failed", error);
      toast.error("Could not load your starred items");
      return;
    }
    s.loaded = true;
    emit(
      s,
      new Set(
        (data ?? [])
          .filter((r: { entity_type: string }) => r.entity_type === type)
          .map((r: { entity_id: string }) => r.entity_id),
      ),
    );
  })();
  return s.loading;
}

export function useFileFavorites(type: FileEntityType) {
  const s = storeFor(type);
  const ids = useSyncExternalStore(
    (l) => {
      s.listeners.add(l);
      return () => s.listeners.delete(l);
    },
    () => s.ids,
    () => s.ids,
  );

  useEffect(() => {
    void load(type);
  }, [type]);

  const toggle = useCallback(
    async (id: string) => {
      const next = !s.ids.has(id);
      const optimistic = new Set(s.ids);
      if (next) optimistic.add(id);
      else optimistic.delete(id);
      const previous = s.ids;
      emit(s, optimistic);
      const { error } = await createClient().rpc("ues_set", {
        p_entity_type: type,
        p_entity_id: id,
        p_is_favorite: next,
      });
      if (error) {
        emit(s, previous);
        toast.error(`Could not ${next ? "star" : "unstar"} this item`);
        return;
      }
      toast.success(next ? "Starred" : "Star removed");
    },
    [s, type],
  );

  return { starredIds: ids, isStarred: (id: string) => ids.has(id), toggle };
}
