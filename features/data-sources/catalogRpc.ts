/**
 * The Data library catalog, read straight from Postgres (`scraper.data_sources_library`): enabled
 * sources, group counts, per-record price in dollars and points, and the organization's limits.
 *
 * Sources whose provider an organization can switch (homes) are then overlaid from the server's
 * `GET /data-sources/routed`, shaped by the same switch read, for the same organization, as the run
 * itself — so the form shows the fields and filters the run will apply. Live 2026-10-22: without it
 * an organization switched to the fast homes provider saw the other provider's form.
 */
import { createClient } from "@/utils/supabase/client";
import { getJson } from "@/lib/python-client";
import { operationFailed } from "@/utils/errors";

type Row = Record<string, unknown>;

async function readRouted(organizationId: string): Promise<Row[]> {
  const { data } = await getJson<{ sources?: unknown }>("/data-sources/routed", { organizationId });
  return Array.isArray(data?.sources) ? (data.sources as Row[]) : [];
}

export async function readDataSourcesCatalog(organizationId: string): Promise<unknown> {
  const [catalog, routed] = await Promise.all([
    createClient().schema("scraper").rpc("data_sources_library", { p_organization_id: organizationId }),
    readRouted(organizationId).then(
      (rows) => ({ rows, failed: null as unknown }),
      (failed: unknown) => ({ rows: [] as Row[], failed }),
    ),
  ]);
  const { data, error } = catalog;
  if (error) throw operationFailed("load the data library", error);
  if (routed.failed) {
    // Loud, not fatal: the catalog still opens, and the run applies the organization's switch on its own.
    console.error("[data-sources] the switched-provider forms could not load", routed.failed);
  }
  if (!routed.rows.length || !data || typeof data !== "object") return data;
  const byKey = new Map(routed.rows.map((r) => [String(r.key), r]));
  const sources = Array.isArray((data as Row).sources) ? ((data as Row).sources as Row[]) : [];
  return { ...(data as Row), sources: sources.map((s) => byKey.get(String(s.key)) ?? s) };
}
