/**
 * The Data library's read of the catalog: `GET /data-sources` with the richer answer (groups,
 * featured, output fields, per-source points) parsed by `./catalog.ts`. The organization is the one
 * the person works in (its limits and prices). Fetching itself goes through `../server.ts`.
 */

import { getJson } from "@/lib/python-client";

import { DataFetchRefusal } from "../contract";
import { parseLibrary, type Library } from "./catalog";

export async function getLibrary(opts: { organizationId: string; signal?: AbortSignal }): Promise<Library> {
  const organizationId = opts.organizationId?.trim();
  if (!organizationId) throw new DataFetchRefusal("organization_required", "Your organization is not loaded yet.");
  const { data } = await getJson<unknown>("/data-sources", { organizationId, signal: opts.signal });
  return parseLibrary(data);
}
