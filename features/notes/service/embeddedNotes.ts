// features/notes/service/embeddedNotes.ts
//
// INTERNAL ROWS NEVER SHOW IN THE PERSON'S NOTES (Arman, 2026-10-22). A feature that stores its own
// text as an ordinary workbench.notes row (a board template's note tile, a sticky note) stamps it
// `metadata: { embedded: true, embedded_in: "<feature>" }`. Every LIST read (Notes list, Recent,
// pickers, search, realtime inserts) leaves those rows out; BY-ID reads never do, so the tile that
// owns the note — and a direct link to it — still opens it. The DB backfill matches this exact marker.

export const EMBEDDED_NOTE_KEY = "embedded";
export const EMBEDDED_IN_KEY = "embedded_in";

/** The PostgREST `or` filter that keeps null/absent metadata and anything not marked embedded. */
export const NOT_EMBEDDED_FILTER = `metadata->>${EMBEDDED_NOTE_KEY}.is.null,metadata->>${EMBEDDED_NOTE_KEY}.neq.true`;

/** The marker, merged into any metadata the writer already has. */
export function withEmbeddedMarker<T extends Record<string, unknown> | null | undefined>(
  metadata: T,
  embeddedIn: string,
): Record<string, unknown> {
  return { ...(metadata ?? {}), [EMBEDDED_NOTE_KEY]: true, [EMBEDDED_IN_KEY]: embeddedIn };
}

/** True when a row's metadata carries the embedded marker (boolean true or the string "true"). */
export function isEmbeddedNote(row: { metadata?: unknown } | null | undefined): boolean {
  const raw = row?.metadata;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const flag = (raw as Record<string, unknown>)[EMBEDDED_NOTE_KEY];
  return flag === true || flag === "true";
}

/** Drop embedded rows from a list read in memory. */
export function withoutEmbeddedNotes<T extends { metadata?: unknown }>(rows: readonly T[]): T[] {
  return rows.filter((row) => !isEmbeddedNote(row));
}

/** Add the database-side "not embedded" condition to a notes LIST query. */
export function excludeEmbeddedNotes<Q extends { or(filters: string): Q }>(query: Q): Q {
  return query.or(NOT_EMBEDDED_FILTER);
}
