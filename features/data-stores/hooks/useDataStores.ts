"use client";

/**
 * useDataStores — list + create + bind hook for `rag.data_stores`.
 *
 * Lazy by design: nothing fires until a consumer mounts. RLS scopes the
 * list to (caller-owns) OR (org-member). Server-side membership lookups
 * use `data_store_members.source_kind = 'processed_document'` as the
 * canonical binding for PDF documents.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import type { DataStore, DataStoreWithMemberCount } from "../types";

function rowToStore(row: Record<string, unknown>): DataStore {
  return {
    id: row.id as string,
    organizationId: (row.organization_id as string | null) ?? null,
    name: (row.name as string) ?? "Untitled",
    shortCode: (row.short_code as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    kind: (row.kind as string | null) ?? null,
    settings: (row.settings as Record<string, unknown>) ?? {},
    isActive: (row.is_active as boolean) ?? false,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useDataStores(): {
  stores: DataStoreWithMemberCount[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createStore: (input: {
    name: string;
    description?: string;
    organizationId?: string | null;
  }) => Promise<DataStore | null>;
} {
  const userId = useAppSelector(selectUserId);
  const [stores, setStores] = useState<DataStoreWithMemberCount[]>([]);
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
          .schema("rag")
          .from("data_stores")
          .select("*")
          .order("created_at", { ascending: false });
        if (err) throw err;
        if (cancelled) return;
        const baseRows = ((data ?? []) as Record<string, unknown>[]).map(
          rowToStore,
        );

        // Member counts — one round-trip, scoped by RLS.
        const ids = baseRows.map((s) => s.id);
        let counts = new Map<string, number>();
        if (ids.length > 0) {
          const { data: memberRows } = await supabase
            .schema("rag")
            .from("data_store_members")
            .select("data_store_id")
            .in("data_store_id", ids);
          for (const m of (memberRows ?? []) as Record<string, unknown>[]) {
            const k = m.data_store_id as string;
            counts.set(k, (counts.get(k) ?? 0) + 1);
          }
        }

        if (cancelled) return;
        setStores(
          baseRows.map((s) => ({
            ...s,
            memberCount: counts.get(s.id) ?? 0,
          })),
        );
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Could not load data stores",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, bumper]);

  const createStore = useCallback(
    async (input: {
      name: string;
      description?: string;
      organizationId?: string | null;
    }) => {
      if (!userId) return null;
      const { data, error: err } = await supabase
        .schema("rag")
        .from("data_stores")
        .insert({
          name: input.name,
          description: input.description ?? null,
          organization_id: input.organizationId ?? null,
          created_by: userId,
          is_active: true,
        })
        .select("*")
        .single();
      if (err || !data) {
        setError(err?.message ?? "Could not create data store");
        return null;
      }
      refresh();
      return rowToStore(data as Record<string, unknown>);
    },
    [userId, refresh],
  );

  return { stores, loading, error, refresh, createStore };
}

/**
 * useDocumentDataStores — which stores does this document belong to,
 * and a `bind`/`unbind` toggle action.
 */
export function useDocumentDataStores(processedDocumentId: string | null) {
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [bumper, setBumper] = useState(0);
  const refresh = useCallback(() => setBumper((b) => b + 1), []);

  useEffect(() => {
    if (!processedDocumentId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .schema("rag")
          .from("data_store_members")
          .select("data_store_id")
          .eq("source_kind", "processed_document")
          .eq("source_id", processedDocumentId);
        if (cancelled) return;
        setMemberOf(
          new Set(
            ((data ?? []) as Record<string, unknown>[]).map(
              (r) => r.data_store_id as string,
            ),
          ),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [processedDocumentId, bumper]);

  const bind = useCallback(
    async (dataStoreId: string) => {
      if (!processedDocumentId) return false;
      const { error: err } = await supabase
        .schema("rag")
        .from("data_store_members")
        .insert({
          data_store_id: dataStoreId,
          source_kind: "processed_document",
          source_id: processedDocumentId,
        });
      if (err) {
        // 23505 = duplicate (already a member). Treat as success.
        if (!String(err.code).startsWith("23")) return false;
      }
      refresh();
      return true;
    },
    [processedDocumentId, refresh],
  );

  const unbind = useCallback(
    async (dataStoreId: string) => {
      if (!processedDocumentId) return false;
      const { error: err } = await supabase
        .schema("rag")
        .from("data_store_members")
        .delete()
        .eq("data_store_id", dataStoreId)
        .eq("source_kind", "processed_document")
        .eq("source_id", processedDocumentId);
      if (err) return false;
      refresh();
      return true;
    },
    [processedDocumentId, refresh],
  );

  return { memberOf, loading, bind, unbind };
}
