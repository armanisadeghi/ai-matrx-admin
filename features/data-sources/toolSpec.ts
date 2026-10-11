/**
 * The agent's `site_data` call (url, or site + query/location/inputs) as a Get-data fetch input
 * for the catalog source it names (pure) — so "Save as table" under a chat result runs the SAME
 * fetch a person would start from the Get data panel.
 */

import type { DataFetchInput, DataSource } from "./contract";

export interface SiteDataToolSpec {
  url?: string | null;
  query?: string | null;
  location?: string | null;
  inputs?: Record<string, unknown>[] | null;
  maxRecords?: number | null;
}

const QUERY_FIELD = /query|keyword|search|term|name/i;
const LOCATION_FIELD = /location|city|country|region|state|place/i;

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Null when the spec cannot fill the source's required fields (the card then offers no save). */
export function fetchInputFromToolSpec(source: DataSource, spec: SiteDataToolSpec): DataFetchInput | null {
  if (source.input.kind === "url") {
    const url = text(spec.url);
    return url ? { url } : null;
  }
  const fields = source.input.fields;
  const rows: Record<string, string>[] = [];
  const given = Array.isArray(spec.inputs) ? spec.inputs : [];
  for (const one of given) {
    const row: Record<string, string> = {};
    for (const f of fields) {
      const v = text((one as Record<string, unknown>)[f.name]);
      if (v) row[f.name] = v;
    }
    rows.push(row);
  }
  if (rows.length === 0) {
    const row: Record<string, string> = {};
    const q = text(spec.query);
    const l = text(spec.location);
    const queryField = fields.find((f) => QUERY_FIELD.test(f.name)) ?? fields[0];
    const locationField = fields.find((f) => f !== queryField && LOCATION_FIELD.test(f.name));
    if (q && queryField) row[queryField.name] = q;
    if (l && locationField) row[locationField.name] = l;
    rows.push(row);
  }
  const complete = rows.every((r) => fields.every((f) => !f.required || r[f.name]?.trim()));
  return complete && rows.some((r) => Object.keys(r).length > 0) ? { inputs: rows } : null;
}
