"use client";

import { useQuery } from "@tanstack/react-query";

import { useCostDisplay } from "@/components/cost/useCostDisplay";

import { createClient } from "@/utils/supabase/client";

import { estimateUsd, parseSpec, type DataFetchSpec, type DataSource } from "./contract";
import { getDataSources } from "./server";

export const dataSourcesKey = (organizationId: string | null) => ["board", "data-sources", organizationId] as const;

/** The server's catalog + limits for this organization (cached for the session; limits re-read every 5 min). */
export function useDataSources(organizationId: string | null) {
  return useQuery({
    queryKey: dataSourcesKey(organizationId),
    queryFn: ({ signal }) => getDataSources({ organizationId: organizationId ?? "", signal }),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}

/** "≈ 38 points" for `n` records of `source` (dollars only for an admin who flipped the switch). */
export function useFetchEstimate() {
  const { format } = useCostDisplay();
  return (source: Pick<DataSource, "usd_per_record"> | null | undefined, n: number): string | null => {
    const usd = estimateUsd(source, n);
    return usd == null ? null : `≈ ${format(usd)}`;
  };
}

/** Where a limit's "change" link goes: the organization's own setting row. */
export function limitSettingHref(organizationId: string | null, setting: string): string | null {
  if (!organizationId || !setting) return null;
  // The knob rows live on the Configuration page (rows anchor at their full key), not the settings index.
  return `/organizations/${encodeURIComponent(organizationId)}/settings/configuration#${encodeURIComponent(setting)}`;
}

export const fetchSpecKey = (tableId: string) => ["board", "data-fetch-spec", tableId] as const;

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
        .select("id,source_key,max_records,status,rows_created,rows_updated,finished_at")
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
