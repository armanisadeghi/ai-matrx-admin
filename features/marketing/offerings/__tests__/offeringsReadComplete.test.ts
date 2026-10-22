/**
 * Products & services reads every row and a Clear is the person's signed act (REVIEW3 I6 + I3, 2026-10-22).
 *
 * I6: `.limit(5000)` is silently capped at 1000 by PostgREST — Tentree has 3,747 offering findings, so the screen showed
 * (and a Yes stamped) only the rows that loaded. Both lists now page through `readAllRows`.
 * I3: Clear wrote `reviewed_at: null, reviewed_by: null`, so it left no person act behind and the person's own INSERT kept
 * the offering validated forever. A Clear is now signed (status pending + reviewed_at + reviewed_by = the person).
 */
const FINDINGS = 3747;
const KEPT = 1200;

type Call = { table: string; op: string; payload?: unknown; range?: [number, number] };
const calls: Call[] = [];

function rowsOf(table: string, from: number, to: number) {
  const total = table === "discovered_item" ? FINDINGS : KEPT;
  const end = Math.min(to, total - 1, from + 999);
  const out = [];
  for (let i = from; i <= end; i += 1) {
    out.push(
      table === "discovered_item"
        ? { id: `f${String(i).padStart(5, "0")}`, value: { key: `item ${i}` }, context: { candidate: { name: `Item ${i}` } }, status: "pending", resolved_offering_id: null }
        : { id: `o${String(i).padStart(5, "0")}`, name: `Kept ${i}`, kind: "service", price_note: null, metadata: {} },
    );
  }
  return { data: out, error: null, count: total };
}

function builder(table: string) {
  let range: [number, number] | null = null;
  let update: unknown;
  const b: Record<string, unknown> = {};
  const self = () => b;
  Object.assign(b, {
    select: self,
    eq: self,
    is: self,
    order: self,
    limit: () => {
      // a capped read: PostgREST returns at most 1000 rows whatever the limit says
      calls.push({ table, op: "limit" });
      return Promise.resolve(rowsOf(table, 0, 999));
    },
    range: (from: number, to: number) => {
      range = [from, to];
      calls.push({ table, op: "range", range });
      return Promise.resolve(rowsOf(table, from, to));
    },
    update: (payload: unknown) => {
      update = payload;
      return b;
    },
    in: () => {
      calls.push({ table, op: "update", payload: update });
      return Promise.resolve({ error: null });
    },
  });
  return b;
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: (table: string) => builder(table),
      rpc: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}));
jest.mock("@/utils/supabase/webDb", () => ({ signedInPersonId: async () => "person-1" }));

import { clearDecision, fetchOfferingItems, type OfferingItem } from "../data";

describe("Products & services", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("reads every offering finding and every kept offering, past PostgREST's 1000-row cap", async () => {
    const items = await fetchOfferingItems("brand-1");
    expect(items.filter((i) => i.rowIds.length).length).toBe(FINDINGS);
    expect(items.filter((i) => i.key.startsWith("offering:")).length).toBe(KEPT);
    expect(calls.some((c) => c.op === "limit")).toBe(false);
  });

  it("a Clear is signed by the person (pending + reviewed_at + reviewed_by), never an unsigned reset", async () => {
    const item = { name: "Drop-off", rowIds: ["f1", "f2"] } as unknown as OfferingItem;
    await clearDecision(item);
    const u = calls.find((c) => c.op === "update");
    expect(u?.payload).toMatchObject({ status: "pending", reviewed_by: "person-1" });
    expect(typeof (u?.payload as { reviewed_at: unknown }).reviewed_at).toBe("string");
  });
});
