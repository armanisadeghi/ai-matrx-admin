"use client";

/**
 * usePdfStudioDocs — scoped, filterable list of `processed_documents` for
 * the studio sidebar. Metadata only.
 *
 * Loads once for the signed-in user, then derives the visible list from
 * client-side filters (search query, derivation kind, source kind). For
 * tens of thousands of documents we'll later page or virtualize, but the
 * underlying Supabase query is metadata-only so it scales well past the
 * 50-row default we used in the floating window.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

export interface StudioDocSummary {
  id: string;
  name: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  totalPages: number | null;
  mimeType: string | null;
  sourceKind: string | null;
  sourceId: string | null;
  parentProcessedId: string | null;
  derivationKind: string;
}

type SortKey = "recent" | "name" | "size";

export function usePdfStudioDocs(opts?: { pageSize?: number }) {
  const pageSize = opts?.pageSize ?? 200;
  const userId = useAppSelector(selectUserId);

  const [docs, setDocs] = useState<StudioDocSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bumper, setBumper] = useState(0);

  const refresh = useCallback(() => setBumper((b) => b + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("processed_documents")
          .select(
            "id, name, storage_uri, created_at, updated_at, total_pages, mime_type, source_kind, source_id, parent_processed_id, derivation_kind",
          )
          .eq("owner_id", userId)
          .order("created_at", { ascending: false })
          .limit(pageSize);
        if (err) throw err;
        if (cancelled) return;
        const rows = (data ?? []) as Record<string, unknown>[];
        setDocs(
          rows.map((r) => ({
            id: r.id as string,
            name: (r.name as string) ?? "Untitled",
            source: (r.storage_uri as string | null) ?? null,
            createdAt: r.created_at as string,
            updatedAt: r.updated_at as string,
            totalPages: (r.total_pages as number | null) ?? null,
            mimeType: (r.mime_type as string | null) ?? null,
            sourceKind: (r.source_kind as string | null) ?? null,
            sourceId: (r.source_id as string | null) ?? null,
            parentProcessedId:
              (r.parent_processed_id as string | null) ?? null,
            derivationKind:
              (r.derivation_kind as string) ?? "initial_extract",
          })),
        );
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Could not load documents",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, pageSize, bumper]);

  // ── Client-side derived filters ─────────────────────────────────────────

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [filterKind, setFilterKind] = useState<string | null>(null);
  // 'all' | 'roots' | 'derivatives' — based on whether parent_processed_id is set.
  const [tier, setTier] = useState<"all" | "roots" | "derivatives">("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = docs;
    if (q) {
      rows = rows.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.id.toLowerCase().startsWith(q),
      );
    }
    if (filterKind) {
      rows = rows.filter((d) => d.derivationKind === filterKind);
    }
    if (tier === "roots") {
      rows = rows.filter((d) => d.parentProcessedId == null);
    } else if (tier === "derivatives") {
      rows = rows.filter((d) => d.parentProcessedId != null);
    }
    if (sortBy === "name") {
      rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "size") {
      rows = [...rows].sort(
        (a, b) => (b.totalPages ?? 0) - (a.totalPages ?? 0),
      );
    } else {
      // recent — keeps Supabase default order
    }
    return rows;
  }, [docs, search, sortBy, filterKind, tier]);

  // ── Derivation kinds present in the corpus, for the filter chip row ────

  const kinds = useMemo(() => {
    const s = new Set<string>();
    for (const d of docs) s.add(d.derivationKind);
    return Array.from(s).sort();
  }, [docs]);

  return {
    docs,
    visible,
    kinds,
    loading,
    error,
    refresh,
    search,
    setSearch,
    sortBy,
    setSortBy,
    filterKind,
    setFilterKind,
    tier,
    setTier,
  };
}
