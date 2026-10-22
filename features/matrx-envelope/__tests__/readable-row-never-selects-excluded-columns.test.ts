/**
 * The generic row read names only columns the client may read. Before: `select("*")` on
 * a table with `client_excluded_columns` failed whole with 42501.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { readRowById, resetExcludedColumnsCache } from "../readableRow";

function fakeDb(excluded: Record<string, string[]>, columns: string[]) {
  const selects: string[] = [];
  const row: Record<string, unknown> = { id: "i", name: "N", secret: "S" };
  const builder = (sel: string) => ({
    eq: () => ({
      maybeSingle: async () => {
        selects.push(sel);
        if (sel === "*" && excluded["s.t"]) return { data: null, error: { code: "42501", message: "denied" } };
        const asked = sel === "*" ? ["id", "name", "secret"] : sel.split(",");
        const bad = asked.find((c) => !columns.includes(c));
        if (bad) return { data: null, error: { code: "42703", message: `no ${bad}` } };
        return { data: Object.fromEntries(asked.map((c) => [c, row[c]])), error: null };
      },
    }),
  });
  const db = {
    rpc: async () => ({
      data: Object.entries(excluded).map(([k, v]) => ({
        schema_name: k.split(".")[0], table_name: k.split(".")[1], client_excluded_columns: v,
      })),
      error: null,
    }),
    schema: () => ({ from: () => ({ select: builder }) }),
    from: () => ({ select: builder }),
  };
  return { db: db as unknown as SupabaseClient, selects };
}

beforeEach(() => resetExcludedColumnsCache());

test("a table with no exclusions is read whole", async () => {
  const { db, selects } = fakeDb({}, ["id", "name", "secret"]);
  const r = await readRowById(db, "s", "t", "i", ["name"]);
  expect(selects).toEqual(["*"]);
  expect(r.data).toMatchObject({ name: "N" });
});

test("excluded columns are never selected", async () => {
  const { db, selects } = fakeDb({ "s.t": ["secret"] }, ["id", "name", "secret"]);
  const r = await readRowById(db, "s", "t", "i", ["name", "secret"]);
  expect(selects.join("|")).not.toMatch(/secret|\*/);
  expect(r.error).toBeNull();
  expect(r.data).toEqual({ id: "i", name: "N" });
});

test("a candidate column the table lacks does not lose the row", async () => {
  const { db } = fakeDb({ "s.t": ["secret"] }, ["id", "name", "secret"]);
  const r = await readRowById(db, "s", "t", "i", ["title", "name"]);
  expect(r.error).toBeNull();
  expect(r.data).toEqual({ id: "i", name: "N" });
});
