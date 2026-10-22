/**
 * Internal rows a feature stores in workbench.notes (board tiles, stickies) carry
 * `metadata.embedded = true` and must never appear in a LIST read — while BY-ID reads
 * still return them so the owning tile opens its note.
 */
const schema = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema } }));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "user-1" }));
jest.mock("@/lib/list-scope", () => ({
  defaultListFilter: async () => ({ apply: (q: unknown) => q }),
  resolveListScope: jest.fn(),
}));
jest.mock("./noteContextAssociations", () => ({
  hydrateNoteContextLinks: async (rows: unknown[]) => rows,
  syncNoteContextLinks: jest.fn(),
}));

import {
  NOT_EMBEDDED_FILTER,
  isEmbeddedNote,
  readEmbeddedNoteIds,
  withEmbeddedMarker,
  withoutEmbeddedNotes,
} from "./embeddedNotes";
import { fetchNoteListItems, fetchNotes, fetchRecentNotePickerRows, searchNotePickerRows } from "./notesService";

/** A fake query that behaves like PostgREST: `.or(NOT_EMBEDDED_FILTER)` drops embedded rows. */
function fakeNotesTable(rows: Array<{ id: string; metadata: unknown }>) {
  let visible = rows;
  const chain: Record<string, jest.Mock> = {};
  const self = () => chain;
  chain.select = jest.fn(self);
  chain.is = jest.fn(self);
  chain.or = jest.fn((filter: string) => {
    if (filter === NOT_EMBEDDED_FILTER) visible = visible.filter((r) => !isEmbeddedNote(r));
    return chain;
  });
  chain.order = jest.fn(self);
  chain.limit = jest.fn(async () => ({ data: visible, error: null }));
  // list reads without a limit resolve on the last .order()
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    resolve({ data: visible, error: null });
  schema.mockReturnValue({ from: () => chain });
  return chain;
}

const ROWS = [
  { id: "plain", metadata: {} },
  { id: "null-meta", metadata: null },
  { id: "tile", metadata: { embedded: true, embedded_in: "board" } },
];

describe("embedded notes", () => {
  it("stamps the exact marker, merged into existing metadata", () => {
    expect(withEmbeddedMarker(null, "board")).toEqual({ embedded: true, embedded_in: "board" });
    expect(withEmbeddedMarker({ run_key: "r1" }, "board")).toEqual({
      run_key: "r1",
      embedded: true,
      embedded_in: "board",
    });
  });

  it("keeps rows with null or absent metadata", () => {
    expect(withoutEmbeddedNotes(ROWS).map((r) => r.id)).toEqual(["plain", "null-meta"]);
    expect(isEmbeddedNote({})).toBe(false);
    expect(isEmbeddedNote({ metadata: { embedded: false } })).toBe(false);
  });

  it("every list read filters embedded rows out", async () => {
    fakeNotesTable(ROWS);
    expect((await fetchRecentNotePickerRows(10)).map((r) => r.id)).toEqual(["plain", "null-meta"]);
    fakeNotesTable(ROWS);
    expect((await searchNotePickerRows("x", 10)).map((r) => r.id)).toEqual(["plain", "null-meta"]);
    fakeNotesTable(ROWS);
    expect((await fetchNotes()).map((r) => (r as { id: string }).id)).toEqual(["plain", "null-meta"]);
    fakeNotesTable(ROWS);
    expect((await fetchNoteListItems()).map((r) => r.id)).toEqual(["plain", "null-meta"]);
  });

  it("readEmbeddedNoteIds asks only for the marker, chunked, and returns the embedded ids", async () => {
    const calls: string[][] = [];
    const eq = jest.fn();
    const client = {
      schema: () => ({
        from: () => ({
          select: () => ({
            in: (_c: "id", ids: string[]) => {
              calls.push(ids);
              return {
                eq: (col: string, val: string) => {
                  eq(col, val);
                  return Promise.resolve({
                    data: ids.filter((id) => id.endsWith("7")).map((id) => ({ id })),
                    error: null,
                  });
                },
              };
            },
          }),
        }),
      }),
    };
    const ids = Array.from({ length: 230 }, (_, i) => `n${i}`);
    const found = await readEmbeddedNoteIds(client as never, ids);
    expect(calls.map((c) => c.length)).toEqual([100, 100, 30]);
    expect(eq).toHaveBeenCalledWith("metadata->>embedded", "true");
    expect([...found].sort()).toEqual(ids.filter((id) => id.endsWith("7")).sort());
  });

  it("readEmbeddedNoteIds throws when the check cannot run (never leaks by silence)", async () => {
    const client = {
      schema: () => ({
        from: () => ({
          select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: null, error: new Error("boom") }) }) }),
        }),
      }),
    };
    await expect(readEmbeddedNoteIds(client as never, ["a"])).rejects.toThrow("boom");
  });

  it("the trash list and the Files tree read through the not-embedded filter", () => {
    // Source-level guard: these readers build their own queries, so pin that each applies the helper.
    const fs = jest.requireActual("fs") as typeof import("fs");
    const root = process.cwd();
    const thunks = fs.readFileSync(`${root}/features/notes/redux/thunks.ts`, "utf8");
    expect(thunks).toMatch(/trashQuery = excludeEmbeddedNotes\(/);
    expect(thunks).toContain("readEmbeddedNoteIds(supabase");
    const files = fs.readFileSync(`${root}/features/files/virtual-sources/adapters/notes.ts`, "utf8");
    expect(files.match(/excludeEmbeddedNotes\(/g)?.length).toBe(2);
  });
});
