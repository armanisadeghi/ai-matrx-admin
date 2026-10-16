/**
 * The Data library's read of the catalog: `GET /data-sources` with the richer answer (groups,
 * featured, output fields, per-source points) parsed by `./catalog.ts`. The organization is the one
 * the person works in (its limits and prices). Fetching itself goes through `../server.ts`.
 */

import { readDataSourcesCatalog } from "../catalogRpc";

import { DataFetchRefusal } from "../contract";
import { parseLibrary, type Library } from "./catalog";

export async function getLibrary(opts: { organizationId: string; signal?: AbortSignal }): Promise<Library> {
  const organizationId = opts.organizationId?.trim();
  if (!organizationId) throw new DataFetchRefusal("organization_required", "Your organization is not loaded yet.");
  return parseLibrary(await readDataSourcesCatalog(organizationId));
}
