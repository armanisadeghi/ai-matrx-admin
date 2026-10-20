/**
 * SERVER-ROWS item 3: "Redesign with AI" added each new property with its own `field_declare` round trip, in a loop
 * (a sibling of the records package's `addFields`, which TABLE-CREATE-SPEED-2 made one call). It now declares every
 * new property in ONE `field_declare_many` call, in order, choices and their colors included, and a refusal adds none.
 * RED before: the fake client saw one fieldDeclare per property and no fieldDeclareMany.
 */
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org" }));
jest.mock("../install-host", () => ({ pageOrganizationId: async () => "org" }));
import type { RecordsClient } from "@ai-matrx/records/core";
import { applyRedesign, type DatabaseDesign } from "../designed-database";

const design = {
  name: "Visits",
  title_property: "name",
  properties: [
    { key: "name", name: "Name", type: "text", options: [] },
    { key: "status", name: "Status", type: "status", options: [{ name: "Booked", color: "blue" }, { name: "Seen", color: "green" }] },
    { key: "when", name: "When", type: "date", options: [] },
    { key: "fee", name: "Fee", type: "currency", options: [] },
  ],
  views: [{ name: "All", layout: "table" }],
  rows: [],
  summary: "",
} as unknown as DatabaseDesign;

function fakeClient(answer: { ok: boolean; error?: { message: string } } = { ok: true }) {
  const calls: Array<[string, unknown]> = [];
  const client = {
    fieldDeclare: async (args: unknown) => (calls.push(["fieldDeclare", args]), { ok: true, data: "f" }),
    fieldDeclareMany: async (args: { specs: unknown[] }) => (calls.push(["fieldDeclareMany", args]), answer.ok ? { ok: true, data: args.specs.map(() => "f") } : { ok: false, error: answer.error }),
  } as unknown as RecordsClient;
  return { client, calls };
}

it("declares every property the table lacks in one call, in order, choices and colors included", async () => {
  const { client, calls } = fakeClient();
  const out = await applyRedesign(design, "11111111-1111-4111-8111-111111111111", ["name"], client);
  expect(out.added).toEqual(["Status", "When", "Fee"]);
  expect(calls.map(([door]) => door)).toEqual(["fieldDeclareMany"]);
  const { table_id, specs } = calls[0]![1] as { table_id: string; specs: Array<Record<string, unknown>> };
  expect(table_id).toBe("11111111-1111-4111-8111-111111111111");
  expect(specs.map((s) => s["label"])).toEqual(["Status", "When", "Fee"]);
  expect(specs.map((s) => s["sort"])).toEqual([1010, 1020, 1030]);
  expect(specs[0]).toMatchObject({ type: "select", options: ["Booked", "Seen"], display_format: { id: "choice", options: { choices: [{ value: "Booked", color: "blue" }, { value: "Seen", color: "green" }] } } });
  expect(specs[1]).toMatchObject({ type: "datetime", kind: "date" });
});

it("asks nothing when the table already has every property", async () => {
  const { client, calls } = fakeClient();
  const out = await applyRedesign(design, "t", ["Name", "status", "WHEN", "fee"], client);
  expect(out.added).toEqual([]);
  expect(calls).toEqual([]);
});

it("a refusal adds none and says the store's own sentence", async () => {
  const { client } = fakeClient({ ok: false, error: { message: "a table cannot have two columns called Fee" } });
  await expect(applyRedesign(design, "t", [], client)).rejects.toThrow("a table cannot have two columns called Fee");
});
