"use client";

/**
 * THE app's records data seam, carrying the person's session (the browser client is itself a
 * singleton). One instance for the whole app, so the ports a records mount builds and its
 * `config` always hold the SAME seam.
 *
 * 🚨 LIGHT ON PURPOSE (2026-10-13 first-load campaign). This lives apart from `recordsUiHost.tsx`,
 * which imports the whole `@ai-matrx/records-ui` root (the grid, its charts, the data table —
 * ~1.4 MB). A reader that only needs the data seam (the data-sources row-count hook, reached from
 * the chat paste offer on EVERY route) imported it from there and put that whole cluster back
 * into every page's first load. Import the seam from HERE; `check:shell-eager-graph` blocks the
 * records-ui root in any eager set.
 */
import { recordsDataSource } from "@ai-matrx/records-ui/helpers";
import { createClient } from "@/utils/supabase/client";

export type RecordsDataSource = ReturnType<typeof recordsDataSource>;

let shared: RecordsDataSource | null = null;

/** The one records data seam (created on first use). */
export function useRecordsDataSource(): RecordsDataSource {
  return (shared ??= recordsDataSource(createClient()));
}
