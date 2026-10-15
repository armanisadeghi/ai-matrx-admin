// features/unified-data/home/dataHomeRecordsSource.ts — AT-RECORD item 5.
//
// THE ⌘K BAR'S RECORDS SECTION: records across EVERY table she can open, named by their table's title
// field, from the store's one search door (`custom.records_search`, via `@ai-matrx/records/search`).
// Never filtered by the active organization (access-ladder); each hit carries its table's name.

import { supabaseDataSource } from "@ai-matrx/records/core";
import { searchRecords, STORE_RECORD_SEARCH_MIN_CHARS, type RecordSearchHit } from "@ai-matrx/records/search";

import { createClient } from "@/utils/supabase/client";
import { recordPageHref } from "@/features/unified-data/table-page/recordPageHref";

export type { RecordSearchHit };
export { STORE_RECORD_SEARCH_MIN_CHARS };

export const RECORD_HITS_LIMIT = 8;

/** Records whose name matches `text`, across every table she can open. Throws the store's words on refusal. */
export async function searchRecordsAcrossTables(text: string): Promise<RecordSearchHit[]> {
  const answered = await searchRecords(supabaseDataSource(createClient()), { search: text, limit: RECORD_HITS_LIMIT });
  if (!answered.ok) throw new Error(`Could not search records. ${answered.error.message ?? ""}`.trim(), { cause: answered.error });
  return answered.data;
}

/** Where a hit opens: the record's own page. */
export function recordHitHref(hit: Pick<RecordSearchHit, "tableId" | "recordId">): string {
  return recordPageHref(hit.tableId, hit.recordId);
}
