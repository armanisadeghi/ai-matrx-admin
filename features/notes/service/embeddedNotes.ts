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

/** The smallest slice of a supabase client this needs (kept structural so tests can fake it). */
type EmbeddedIdReader = {
  schema(name: "workbench"): {
    from(table: "notes"): {
      select(columns: string): {
        in(column: "id", values: string[]): {
          eq(column: string, value: string): PromiseLike<{ data: { id: string }[] | null; error: unknown }>;
        };
      };
    };
  };
};

const EMBEDDED_ID_CHUNK = 100;

/**
 * Which of these ids are embedded rows. For reads that cannot carry `metadata` themselves
 * (the `get_notes_shared_with_me` RPC returns no metadata column): one small follow-up read of the
 * marker, chunked to keep the URL short. A failed read throws — showing an internal row because the
 * check could not run is the exact leak this helper exists to stop.
 */
export async function readEmbeddedNoteIds(client: EmbeddedIdReader, ids: readonly string[]): Promise<Set<string>> {
  const embedded = new Set<string>();
  for (let i = 0; i < ids.length; i += EMBEDDED_ID_CHUNK) {
    const chunk = ids.slice(i, i + EMBEDDED_ID_CHUNK);
    const { data, error } = await client
      .schema("workbench")
      .from("notes")
      .select("id")
      .in("id", chunk)
      .eq(`metadata->>${EMBEDDED_NOTE_KEY}`, "true");
    if (error) throw error;
    for (const row of data ?? []) embedded.add(row.id);
  }
  return embedded;
}
