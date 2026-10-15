/**
 * List RPCs return `total_count` as a window-function count, identical on every
 * row. It is list metadata, not record data — split it off at the service edge so
 * it never travels with a row (copy-as-JSON, selection, overlays, caches).
 */
export function splitTotalCount<T extends { total_count?: unknown }>(
  rows: readonly T[],
): { total: number; rows: Omit<T, "total_count">[] } {
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return {
    total,
    rows: rows.map((row) => {
      const { total_count: _total, ...rest } = row;
      return rest;
    }),
  };
}
