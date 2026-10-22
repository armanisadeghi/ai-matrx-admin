/**
 * THE ONE GENERIC ROW READ THAT NEVER ASKS FOR A COLUMN THE CLIENT MAY NOT READ.
 *
 * `select("*")` on a table whose registry row declares `client_excluded_columns`
 * (`platform.entity_types`; the column grant withholds them) fails whole with
 * 42501 — so a generic resolver silently lost every such table. The exclusion
 * list is read live from `public.entity_client_excluded_columns()` (once per
 * page load) and the select names only readable columns:
 *
 *  - table declares nothing  -> `*`, exactly as before;
 *  - table declares columns  -> `id` + the candidate columns minus the excluded
 *    ones. A candidate the table does not have (42703) is dropped by reading the
 *    candidates one at a time, so a missing title column never loses the row.
 *
 * Used by `referenceResolvers.ts` (derived resolver) and `directiveRecordRow.ts`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type ExcludedMap = Map<string, Set<string>>;

let excludedLoad: Promise<ExcludedMap> | null = null;

/** Test seam: forget the cached registry read. */
export function resetExcludedColumnsCache(): void {
  excludedLoad = null;
}

function loadExcluded(db: SupabaseClient): Promise<ExcludedMap> {
  if (!excludedLoad) {
    excludedLoad = Promise.resolve(db.schema("platform").rpc("entity_client_excluded_columns"))
      .then(({ data, error }) => {
        if (error || !Array.isArray(data)) throw new Error(error?.message ?? "no registry rows");
        const map: ExcludedMap = new Map();
        for (const row of data as {
          schema_name: string;
          table_name: string;
          client_excluded_columns: string[] | null;
        }[]) {
          map.set(`${row.schema_name}.${row.table_name}`, new Set(row.client_excluded_columns ?? []));
        }
        return map;
      })
      .catch((e) => {
        excludedLoad = null; // retry next read; never cache a failure
        throw e;
      });
  }
  return excludedLoad;
}

/** Columns the client may not read on `schema.table` (empty when none are declared). */
export async function excludedColumnsFor(
  db: SupabaseClient,
  schema: string,
  table: string,
): Promise<Set<string>> {
  try {
    return (await loadExcluded(db)).get(`${schema}.${table}`) ?? new Set();
  } catch {
    // Registry unreachable: behave as before (`*`) rather than lose every row.
    return new Set();
  }
}

export interface ReadableRowResult {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
}

/**
 * One row by id, readable columns only. `candidates` is what the caller wants
 * on a table with exclusions (title-ish fields); a table with none is read whole.
 */
export async function readRowById(
  db: SupabaseClient,
  schema: string,
  table: string,
  id: string,
  candidates: readonly string[],
): Promise<ReadableRowResult> {
  const from = () => (schema === "public" ? db.from(table) : db.schema(schema).from(table));
  const excluded = await excludedColumnsFor(db, schema, table);
  if (excluded.size === 0) {
    const { data, error } = await from().select("*").eq("id", id).maybeSingle();
    return { data: (data as Record<string, unknown> | null) ?? null, error };
  }
  const columns = [...new Set(["id", ...candidates])].filter((c) => !excluded.has(c));
  const whole = await from().select(columns.join(",")).eq("id", id).maybeSingle();
  if (!whole.error) return { data: (whole.data as unknown as Record<string, unknown> | null) ?? null, error: null };
  if (whole.error.code !== "42703") return { data: null, error: whole.error };
  // A candidate column does not exist on this table: read them one at a time.
  const parts = await Promise.all(
    columns.map(async (c) => {
      const r = await from().select(c).eq("id", id).maybeSingle();
      return r.error ? null : ((r.data as unknown as Record<string, unknown> | null) ?? null);
    }),
  );
  if (!parts.some(Boolean)) return { data: null, error: null };
  return { data: Object.assign({}, ...parts.filter(Boolean)) as Record<string, unknown>, error: null };
}
