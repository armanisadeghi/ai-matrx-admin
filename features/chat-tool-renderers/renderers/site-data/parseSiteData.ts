import type { ToolLifecycleEntry } from "@ai-matrx/chat/agents/types/request.types";
import { getArg, resultAsObject } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared";

import type { SiteDataToolSpec } from "@/features/data-sources/toolSpec";

export interface ParsedSiteData {
  /** The source's catalog key (the result's `site`). */
  siteKey: string | null;
  label: string | null;
  /** Set when the call saved the records (`save_to_table`). */
  tableId: string | null;
  tableName: string | null;
  recordCount: number;
  records: Record<string, unknown>[];
  /** Columns for the compact preview: scalar fields in first-seen order. */
  columns: string[];
  spec: SiteDataToolSpec;
}

const MAX_COLUMNS = 5;

const scalar = (v: unknown) => typeof v === "string" || typeof v === "number" || typeof v === "boolean";

/** Up to `max` columns whose values are plain text/number/yes-no in the records, first-seen order. */
export function previewColumns(records: readonly Record<string, unknown>[], max = MAX_COLUMNS): string[] {
  const seen: string[] = [];
  for (const r of records.slice(0, 10)) {
    for (const [k, v] of Object.entries(r)) {
      if (!seen.includes(k) && scalar(v) && String(v).length <= 200) seen.push(k);
    }
  }
  return seen.slice(0, max);
}

export function parseSiteData(entry: ToolLifecycleEntry): ParsedSiteData | null {
  const r = resultAsObject(entry);
  if (!r || !Array.isArray(r.records)) return null;
  const records = r.records.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  const inputs = getArg<unknown>(entry, "inputs");
  return {
    siteKey: str(r.site),
    label: str(r.label),
    tableId: str(r.table_id),
    tableName: str(r.table_name),
    recordCount: typeof r.record_count === "number" ? r.record_count : records.length,
    records,
    columns: previewColumns(records),
    spec: {
      url: str(getArg(entry, "url")),
      query: str(getArg(entry, "query")),
      location: str(getArg(entry, "location")),
      inputs: Array.isArray(inputs) ? (inputs as Record<string, unknown>[]) : null,
      maxRecords: typeof getArg(entry, "max_records") === "number" ? (getArg<number>(entry, "max_records") ?? null) : null,
    },
  };
}
