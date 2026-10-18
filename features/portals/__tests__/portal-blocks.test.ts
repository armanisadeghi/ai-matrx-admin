/**
 * Lane PORTAL-BLOCKS — a portal page's charts, tiles and lists are computed over HER rows only,
 * and read only the Fields the portal shows. Real use case: a bookkeeping firm's client portal
 * ("Your invoices": status, amount) where two clients must see different totals.
 */
import { blockProblem, chartResult, detailFieldKeys, kpiValue, listFields, type BlockContext, type PortalBlock } from "../blocks";
import { isHers } from "../shown";

jest.mock("server-only", () => ({}), { virtual: true });

const shown = [
  { key: "status", label: "Status", type: "text" },
  { key: "amount", label: "Amount", type: "number" },
  { key: "client", label: "Client", type: "relation" },
];
const all = [
  { id: "1", document: { status: "paid", amount: 100, client: "ada" } },
  { id: "2", document: { status: "open", amount: 250, client: "ada" } },
  { id: "3", document: { status: "paid", amount: 40, client: "bo" } },
  { id: "4", document: { status: "paid", amount: "60", client: "ada", internal_margin: 9 } },
];
const hers = (who: string): BlockContext["rows"] => all.filter((r) => isHers(r.document, "client", who));
const ctx = (who: string): BlockContext => ({ shown, rows: hers(who) });
const total: PortalBlock = { kind: "kpi", table_id: "t", measure_op: "sum", measure_key: "amount" };
const byStatus: PortalBlock = { kind: "bar", table_id: "t", group_by: "status" };

test("a second portal person sees different numbers", () => {
  expect(kpiValue(total, ctx("ada"))).toBe(410);
  expect(kpiValue(total, ctx("bo"))).toBe(40);
  expect(kpiValue({ kind: "kpi", table_id: "t" }, ctx("ada"))).toBe(3);
  expect(kpiValue({ kind: "kpi", table_id: "t" }, ctx("bo"))).toBe(1);
});

test("a chart groups her rows only", () => {
  const ada = chartResult(byStatus, ctx("ada")).rows as Array<{ groups: Record<string, string | null>; row_count: number }>;
  expect(Object.fromEntries(ada.map((r) => [r.groups.status, r.row_count]))).toEqual({ paid: 2, open: 1 });
  const bo = chartResult(byStatus, ctx("bo")).rows as typeof ada;
  expect(bo.map((r) => r.row_count)).toEqual([1]);
});

test("a block cannot read a field the portal does not show", () => {
  expect(blockProblem({ ...byStatus, group_by: "internal_margin" }, ctx("ada"))).toMatch(/does not show/);
  expect(blockProblem({ ...total, measure_key: "internal_margin" }, ctx("ada"))).toMatch(/does not show/);
  expect(blockProblem(byStatus, ctx("ada"))).toBeNull();
  expect(listFields({ kind: "list", table_id: "t", fields: ["internal_margin", "status"] }, shown).map((f) => f.key)).toEqual(["status"]);
});

test("the record page shows the owner's chosen fields, never one the portal hides", () => {
  const blocks: PortalBlock[] = [{ kind: "list", table_id: "t", detail_fields: ["amount", "internal_margin"] }];
  expect(detailFieldKeys(blocks, "t", ["status", "amount"])).toEqual(["amount"]);
  expect(detailFieldKeys(blocks, "other", ["status", "amount"])).toBeNull();
  expect(detailFieldKeys(undefined, "t", ["status"])).toBeNull();
});
