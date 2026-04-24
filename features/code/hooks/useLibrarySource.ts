"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getLibrarySource, type SourceEntry } from "../library-sources";

type Status = "idle" | "loading" | "ready" | "error";

interface UseLibrarySourceResult {
  entries: SourceEntry[];
  status: Status;
  error: string | null;
  load: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Lazily fetch the list of entries for a given source (keyed by
 * `sourceId`). Callers invoke `load()` when the tree branch is first
 * expanded, and `reload()` after a save to refresh `updated_at` /
 * display names in the tree.
 *
 * We deliberately keep state local (no Redux slice) because source
 * lists are small, cheap to refetch, and only visible when the user
 * has the Library panel open.
 *
 * TODO: Add Realtime subscriptions (per-source table) to push row
 * changes into this cache the moment they happen. Until then, saves
 * trigger a re-fetch via `reload()`.
 */
export function useLibrarySource(sourceId: string): UseLibrarySourceResult {
  const userId = useAppSelector(selectUserId) ?? null;

  const [entries, setEntries] = useState<SourceEntry[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  const run = useCallback(async (): Promise<void> => {
    const adapter = getLibrarySource(sourceId);
    if (!adapter) {
      setStatus("error");
      setError(`Unknown library source "${sourceId}"`);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const supabase = createClient();
      const list = await adapter.list(supabase, userId);
      setEntries(list);
      setStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEntries([]);
      setStatus("error");
      setError(message);
    }
  }, [sourceId, userId]);

  const load = useCallback(async (): Promise<void> => {
    // Dedupe concurrent calls from sibling components.
    if (inflight.current) return inflight.current;
    if (status === "loading" || status === "ready") return;
    const p = run().finally(() => {
      inflight.current = null;
    });
    inflight.current = p;
    return p;
  }, [run, status]);

  const reload = useCallback(async (): Promise<void> => {
    if (inflight.current) return inflight.current;
    const p = run().finally(() => {
      inflight.current = null;
    });
    inflight.current = p;
    return p;
  }, [run]);

  // Reset whenever the signed-in user changes so a new session doesn't
  // inherit the previous user's cached entries.
  useEffect(() => {
    setEntries([]);
    setStatus("idle");
    setError(null);
  }, [userId, sourceId]);

  return { entries, status, error, load, reload };
}
