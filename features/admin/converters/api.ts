/**
 * features/admin/converters/api.ts
 *
 * Contract-bound client for aidream's `/admin/converters` (admin-gated server-side).
 */

import type { ConverterCatalog } from "./types";
import { listConverters } from "@ai-matrx/api/architecture";
import { serverApi } from "@/lib/api/server-api";

export async function getConverterCatalog(): Promise<ConverterCatalog> {
  const data = await listConverters(serverApi, {});
  return data;
}
