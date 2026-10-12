"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/utils/supabase/client";

import { parseFetchedTables, parseSpec, type FetchedTable, type DataFetchSpec, type DataSource } from "./contract";
import { usePriceText } from "./library/hooks";
import { getDataSources } from "./server";

export const dataSourcesKey = (organizationId: string | null) => ["data-sources", "catalog", organizationId] as const;

/** The server's catalog + limits for this organization (cached for the session; limits re-read every 5 min). */
export function useDataSources(organizationId: string | null) {
  return useQuery({
    queryKey: dataSourcesKey(organizationId),
    queryFn: ({ signal }) => getDataSources({ organizationId: organizationId ?? "", signal }),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * "≈ 38 points" for `n` records of `source`: the source's OWN points price × the count (dollars
 * only for an admin who flipped the switch). Null when the server named no price.
 */
export function useFetchEstimate() {
  const price = usePriceText();
  return (source: Pick<DataSource, "usd_per_record" | "points_per_record"> | null | undefined, n: number): string | null => {
    if (!source || n <= 0) return null;
    const text = price({ pointsPerRecord: source.points_per_record ?? null, usd_per_record: source.usd_per_record }, n);
    return text == null ? null : `≈ ${text}`;
  };
}

/** Where a limit's "change" link goes: the organization's own setting row. */
export function limitSettingHref(organizationId: string | null, setting: string): string | null {
  if (!organizationId || !setting) return null;
  // The knob rows live on the Configuration page (rows anchor at their full key), not the settings index.
  return `/organizations/${encodeURIComponent(organizationId)}/settings/configuration#${encodeURIComponent(setting)}`;
}

export const fetchSpecKey = (tableId: string) => ["data-sources", "fetch-spec", tableId] as const;

/**
 * The table's refresh spec — the newest `scraper.data_fetch_job` row for it, read client-direct
 * under RLS (aidream `services/data_fetch/FEATURE.md`). Null when the table was never fetched.
 */
export function useFetchSpec(tableId: string) {
  return useQuery({
    queryKey: fetchSpecKey(tableId),
    queryFn: async (): Promise<DataFetchSpec | null> => {
      const { data, error } = await createClient()
        .schema("scraper")
        .from("data_fetch_job")
        .select("id,source_key,max_records,status,rows_created,rows_updated,finished_at,created_at")
        .eq("table_id", tableId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return parseSpec(data);
    },
    staleTime: 60 * 1000,
  });
}

export const fetchedTablesKey = ["data-sources", "fetched-tables"] as const;

/** The tables this person made with Get data (newest first), read client-direct under RLS. */
export function useFetchedTables() {
  return useQuery({
    queryKey: fetchedTablesKey,
    queryFn: async (): Promise<FetchedTable[]> => {
      const { data, error } = await createClient()
        .schema("scraper")
        .from("data_fetch_job")
        .select("table_id,table_name,source_key,finished_at")
        .not("table_id", "is", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return parseFetchedTables(data);
    },
    staleTime: 30 * 1000,
  });
}
