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

/**
 * Loose-typed view of the supabase client for tables in the `rag` schema.
 *
 * The generated `types/database.types.ts` only carries the `public` schema,
 * so calls like `supabase.schema('rag').from('data_stores')` fail to type-
 * check against the strict `Database` generic. RLS still enforces access on
 * the server, so this is a typing escape only — the runtime is unchanged.
 *
 * When the type-gen pipeline starts emitting non-public schemas, drop this
 * cast and import the proper schema-typed client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

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
    kind?: string;
    shortCode?: string | null;
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
        const { data, error: err } = await sb
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
          const { data: memberRows } = await sb
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
      kind?: string;
      shortCode?: string | null;
    }) => {
      if (!userId) return null;
      const { data, error: err } = await sb
        .schema("rag")
        .from("data_stores")
        .insert({
          name: input.name,
          description: input.description ?? null,
          organization_id: input.organizationId ?? null,
          kind: input.kind ?? "general",
          short_code: input.shortCode ?? null,
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
 * useDataStoreDetail — full detail + members of a single store, with
 * RLS-respecting label enrichment for known source kinds.
 *
 * Used by the management page (not the bind panel — that one only needs
 * the membership Set for the active document).
 */
export interface EnrichedMember {
  dataStoreId: string;
  sourceKind: string;
  sourceId: string;
  addedBy: string | null;
  addedAt: string;
  notes: string | null;
  /** Best-effort human label looked up per source_kind. Null on miss. */
  label: string | null;
}

export function useDataStoreDetail(storeId: string | null) {
  const [store, setStore] = useState<DataStore | null>(null);
  const [members, setMembers] = useState<EnrichedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bumper, setBumper] = useState(0);

  const refresh = useCallback(() => setBumper((b) => b + 1), []);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      setMembers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: storeRow, error: sErr } = await sb
          .schema("rag")
          .from("data_stores")
          .select("*")
          .eq("id", storeId)
          .single();
        if (sErr) throw sErr;
        if (cancelled) return;
        setStore(rowToStore(storeRow as Record<string, unknown>));

        const { data: rawMembers, error: mErr } = await sb
          .schema("rag")
          .from("data_store_members")
          .select("*")
          .eq("data_store_id", storeId)
          .order("added_at", { ascending: false });
        if (mErr) throw mErr;
        if (cancelled) return;

        const memberRows = (rawMembers ?? []) as Record<string, unknown>[];

        // Bucket source_ids by kind for the label lookup.
        const idsByKind = new Map<string, string[]>();
        for (const m of memberRows) {
          const k = m.source_kind as string;
          const arr = idsByKind.get(k) ?? [];
          arr.push(m.source_id as string);
          idsByKind.set(k, arr);
        }

        const labelByKey = new Map<string, string>();
        for (const [kind, ids] of idsByKind) {
          if (ids.length === 0) continue;
          if (kind === "cld_file") {
            const { data } = await supabase
              .from("cld_files")
              .select("id, file_name")
              .in("id", ids);
            for (const r of (data ?? []) as Record<string, unknown>[]) {
              labelByKey.set(`${kind}/${r.id}`, r.file_name as string);
            }
          } else if (kind === "processed_document") {
            const { data } = await supabase
              .from("processed_documents")
              .select("id, name")
              .in("id", ids);
            for (const r of (data ?? []) as Record<string, unknown>[]) {
              labelByKey.set(`${kind}/${r.id}`, r.name as string);
            }
          } else if (kind === "library_doc") {
            const { data } = await sb
              .schema("rag")
              .from("library_docs")
              .select("id, title")
              .in("id", ids);
            for (const r of (data ?? []) as Record<string, unknown>[]) {
              labelByKey.set(`${kind}/${r.id}`, r.title as string);
            }
          }
          // Other source_kinds fall through with label=null.
        }

        if (cancelled) return;
        setMembers(
          memberRows.map((m) => ({
            dataStoreId: m.data_store_id as string,
            sourceKind: m.source_kind as string,
            sourceId: m.source_id as string,
            addedBy: (m.added_by as string | null) ?? null,
            addedAt: m.added_at as string,
            notes: (m.notes as string | null) ?? null,
            label: labelByKey.get(
              `${m.source_kind}/${m.source_id}`,
            ) ?? null,
          })),
        );
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Could not load data store",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, bumper]);

  const addMember = useCallback(
    async (input: {
      sourceKind: string;
      sourceId: string;
      notes?: string;
    }) => {
      if (!storeId) return false;
      const { error: err } = await sb
        .schema("rag")
        .from("data_store_members")
        .upsert({
          data_store_id: storeId,
          source_kind: input.sourceKind,
          source_id: input.sourceId,
          notes: input.notes ?? null,
        });
      if (err) {
        setError(err.message);
        return false;
      }
      refresh();
      return true;
    },
    [storeId, refresh],
  );

  const removeMember = useCallback(
    async (sourceKind: string, sourceId: string) => {
      if (!storeId) return false;
      const { error: err } = await sb
        .schema("rag")
        .from("data_store_members")
        .delete()
        .eq("data_store_id", storeId)
        .eq("source_kind", sourceKind)
        .eq("source_id", sourceId);
      if (err) {
        setError(err.message);
        return false;
      }
      refresh();
      return true;
    },
    [storeId, refresh],
  );

  const updateStore = useCallback(
    async (patch: {
      name?: string;
      description?: string | null;
      shortCode?: string | null;
      kind?: string | null;
      isActive?: boolean;
    }) => {
      if (!storeId) return false;
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.description !== undefined) update.description = patch.description;
      if (patch.shortCode !== undefined) update.short_code = patch.shortCode;
      if (patch.kind !== undefined) update.kind = patch.kind;
      if (patch.isActive !== undefined) update.is_active = patch.isActive;
      if (Object.keys(update).length === 0) return true;
      const { error: err } = await sb
        .schema("rag")
        .from("data_stores")
        .update(update)
        .eq("id", storeId);
      if (err) {
        setError(err.message);
        return false;
      }
      refresh();
      return true;
    },
    [storeId, refresh],
  );

  const deleteStore = useCallback(async () => {
    if (!storeId) return false;
    const { error: err } = await sb
      .schema("rag")
      .from("data_stores")
      .delete()
      .eq("id", storeId);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, [storeId]);

  return {
    store,
    members,
    loading,
    error,
    refresh,
    addMember,
    removeMember,
    updateStore,
    deleteStore,
  };
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
        const { data } = await sb
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
      const { error: err } = await sb
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
      const { error: err } = await sb
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
