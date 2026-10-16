/**
 * The Data library catalog, read straight from Postgres (`scraper.data_sources_library`): enabled
 * sources, group counts, per-record price in dollars and points, and the organization's limits.
 * The Python server is not involved; fetching itself still goes through `./server.ts`.
 */
import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";

export async function readDataSourcesCatalog(organizationId: string): Promise<unknown> {
  const { data, error } = await createClient().schema("scraper").rpc("data_sources_library", {
    p_organization_id: organizationId,
  });
  if (error) throw operationFailed("load the data library", error);
  return data;
}
