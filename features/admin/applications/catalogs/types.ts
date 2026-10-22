// features/admin/applications/catalogs/types.ts
//
// Remote Catalogs admin — typed rows for public.catalog_entries /
// public.catalog_entries_history. All shapes derive from the generated
// Database types — never hand-mirrored.
// Cross-repo system-of-record:
// /Users/armanisadeghi/code/common-docs/systems/apps/remote-catalogs/FEATURE.md

import type { Database } from "@/types/database.types";

export type CatalogEntryRow =
  Database["public"]["Tables"]["catalog_entries"]["Row"];

export type CatalogEntryHistoryRow =
  Database["public"]["Tables"]["catalog_entries_history"]["Row"];

export type CatalogUpsertArgs =
  Database["ops"]["Functions"]["admin_upsert_catalog_entry"]["Args"];

/** Prefill handed from “Add from link” to the entry editor. */
export interface EntryPrefill {
  kind: string;
  key: string;
  payload: Record<string, unknown>;
  artifact_url: string | null;
  artifact_sha256: string | null;
  artifact_size_bytes: number | null;
  notes: string | null;
}
