/**
 * features/admin/converters/api.ts
 *
 * Contract-bound client for aidream's `/admin/converters` (admin-gated server-side).
 */
import { apiGet, buildPath } from "@/lib/api/typed-client";

import type { ConverterCatalog } from "./types";

export async function getConverterCatalog(): Promise<ConverterCatalog> {
  const { data } = await apiGet(buildPath("/admin/converters", {}));
  return data;
}
