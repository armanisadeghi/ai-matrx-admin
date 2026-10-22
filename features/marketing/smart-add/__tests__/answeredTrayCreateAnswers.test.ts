/**
 * The validate page's Answered tray lists the answers given at Create too (2026-10-22): Create records each Yes it
 * acted on through `persistAnswer(... { created })` with `context.answer.from = "smart_add.create"`, and the tray read
 * only "smart_add.validate", so a person could neither see nor undo a Create answer there. The tray now reads both,
 * and a Create answer's Undo goes through the same path as any other: the home Create made is taken back, then the
 * finding goes back to pending.
 */
const filters: Array<{ op: string; col: string; val: unknown }> = [];
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];

const CREATE_ROW = {
  id: "row-ig",
  category: "social",
  guessed_kind: "instagram",
  url: "https://www.instagram.com/barechiropractic",
  value: { text: "https://www.instagram.com/barechiropractic", handle: "barechiropractic" },
  context: {
    evidence_key: "social:instagram:barechiropractic",
    where: "website",
    answer: { answer: "ours", by: "person", from: "smart_add.create", homes: ["web.property:prop-ig"], before: {} },
  },
  confidence: 0.9,
  status: "confirmed",
  relation_key: "ours",
  reviewed_at: "2026-10-22T15:46:01Z",
  resolved_property_id: "prop-ig",
};

function builder(table: string, op: string, payload?: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  for (const m of ["eq", "in", "is", "not", "order", "limit", "select"]) {
    b[m] = (col: string, val: unknown) => {
      if (op === "select") filters.push({ op: m, col, val });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => void) => {
    if (op === "update") updates.push({ table, patch: payload ?? {} });
    if (table === "discovered_item" && op === "select") {
      // Answer the query the way PostgREST would: only rows whose answer.from passes the tray's filter.
      const f = filters.find((x) => x.col === "context->answer->>from");
      const allowed = f ? (Array.isArray(f.val) ? f.val : [f.val]) : [];
      return resolve({ data: allowed.includes(CREATE_ROW.context.answer.from) ? [CREATE_ROW] : [], error: null });
    }
    return resolve({ data: [], error: null });
  };
  return b;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  signedInPersonId: async () => "person-1",
  authenticatedWebDb: async () => ({
    rpc: jest.fn(async () => ({ data: { applied: true }, error: null })),
    from: (table: string) => ({
      select: () => builder(table, "select"),
      update: (p: Record<string, unknown>) => builder(table, "update", p),
    }),
  }),
}));
const deleteProperty = jest.fn(async (_id: string) => undefined);
jest.mock("@/features/marketing/data/service", () => ({
  deleteProperty: (id: string) => deleteProperty(id),
  deleteSite: jest.fn(),
  deleteBrandAsset: jest.fn(),
  deleteBusinessFact: jest.fn(),
  getBrand: jest.fn(),
  updateBrand: jest.fn(),
}));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { add: jest.fn(async () => ({ ok: true })), remove: jest.fn(async () => ({ ok: true })) },
}));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn(() => null) }));
jest.mock("../promote", () => ({ promoteSmartAddFindings: jest.fn(), promotedHomes: () => [], undoPromotion: jest.fn(async () => undefined), PROMOTED_TYPES: [] }));

import { loadSavedAnswers } from "../validate/savedAnswers";

const brand = { id: "brand-1" } as never;
const ctx = { ourHosts: [], ourAccounts: [], name: null } as never;

beforeEach(() => {
  filters.length = 0;
  updates.length = 0;
  deleteProperty.mockClear();
});

it("lists an answer given at Create in the Answered tray", async () => {
  const saved = await loadSavedAnswers(brand, [], ctx);
  expect(saved.entries.map((e) => e.id)).toEqual(["row-ig"]);
  expect(saved.entries[0].answer).toBe("ours");
  expect(saved.entries[0].persisted.homes).toEqual(["web.property:prop-ig"]);
});

it("undoes a Create answer through the same path: Create's account goes, the finding goes back to pending", async () => {
  const saved = await loadSavedAnswers(brand, [], ctx);
  await saved.entries[0].persisted.undo();
  expect(deleteProperty).toHaveBeenCalledWith("prop-ig");
  expect(updates.some((u) => u.table === "discovered_item" && u.patch.status === "pending")).toBe(true);
});
