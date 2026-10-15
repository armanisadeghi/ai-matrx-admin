/**
 * MKT-125: the same card answered twice at once (a repeated key press) saves ONE row. The second answer waits for
 * the first, finds its row and answers it in place; it never inserts a second.
 */
type Row = { id: string; context: Record<string, unknown>; status: string };
const table: Row[] = [];
let nextId = 1;
const tick = () => new Promise((r) => setTimeout(r, 5));

function builder(op: "select" | "insert" | "update", payload?: Record<string, unknown>) {
  const state = { id: null as string | null };
  const b: Record<string, unknown> = {};
  const chain = () => b;
  for (const m of ["eq", "in", "is", "limit"]) {
    b[m] = (col?: string, val?: unknown) => {
      if (m === "eq" && col === "id") state.id = val as string;
      return chain();
    };
  }
  b.select = () => b;
  b.single = async () => {
    await tick();
    const row: Row = { id: `row-${nextId++}`, context: (payload?.context as Record<string, unknown>) ?? {}, status: String(payload?.status) };
    table.push(row);
    return { data: { id: row.id }, error: null };
  };
  b.then = (resolve: (v: unknown) => void) => {
    void (async () => {
      await tick();
      if (op === "update") {
        const row = table.find((r) => r.id === state.id);
        if (row && payload) Object.assign(row, payload);
        resolve({ data: null, error: null });
      } else resolve({ data: table.map((r) => ({ ...r, relation_key: null, reviewed_at: null, resolved_property_id: null, resolved_fact_id: null })), error: null });
    })();
  };
  return b;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  authenticatedWebDb: async () => ({
    from: () => ({
      select: () => builder("select"),
      insert: (p: Record<string, unknown>) => builder("insert", p),
      update: (p: Record<string, unknown>) => builder("update", p),
    }),
  }),
}));
jest.mock("@/features/marketing/data/service", () => ({}));
jest.mock("@/features/education/kits/systemRuns", () => ({ startSystemRun: jest.fn() }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: {} }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn() }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: jest.fn() }));

import { persistAnswer, type PersistContext } from "../validate/persist";
import type { FocusItem } from "../validate/queue";

const ctx = { organizationId: "o1", getBrand: () => ({ id: "b1" }), setBrand: jest.fn(), kinds: [] } as unknown as PersistContext;
const card = { key: "category:clothing", kind: "name", label: "Category", value: "Clothing", title: null, twins: [], openUrl: null, evidence: null, fact: null, suggestion: null } as unknown as FocusItem;

it("two simultaneous answers to one card leave one saved row", async () => {
  table.length = 0;
  await Promise.all([persistAnswer(ctx, card, "correct"), persistAnswer(ctx, card, "correct"), persistAnswer(ctx, card, "correct")]);
  expect(table).toHaveLength(1);
  expect(table[0].status).toBe("confirmed");
});
