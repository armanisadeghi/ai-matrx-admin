/**
 * Products & services shows standing honestly (2026-10-22).
 *
 * The screen showed every ACTIVE `web.brand_offering` as confirmed, so the 63 offerings code minted for All Green
 * (50) and IOPBM (13) could be answered No but never Yes. An offering is confirmed only when a PERSON validated it —
 * `web.person_validated_offering_ids`, the one rule aidream `person_validated_offerings` reads too. Everything else is
 * "not confirmed" with Yes / No, and a Yes records the person's word through the one keep path (a reviewed finding
 * naming the offering), even for a kept offering no finding names.
 */
type Call = { table: string; op: string; payload?: unknown; ids?: unknown };
const calls: Call[] = [];
let validated: string[] = [];

function chain(table: string) {
  const q: Record<string, unknown> = {};
  const done = { data: [], error: null };
  Object.assign(q, {
    select: () => q,
    eq: () => q,
    is: () => q,
    limit: () => Promise.resolve(done),
    insert: (payload: unknown) => {
      calls.push({ table, op: "insert", payload });
      return Object.assign(Promise.resolve({ data: null, error: null }), {
        select: () => ({ single: () => Promise.resolve({ data: { id: "new-offering" }, error: null }) }),
      });
    },
    update: (payload: unknown) => ({
      in: (_c: string, ids: unknown) => {
        calls.push({ table, op: "update", payload, ids });
        return Promise.resolve({ error: null });
      },
      eq: () => Promise.resolve({ error: null }),
    }),
  });
  return q;
}
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: (t: string) => chain(t),
      rpc: (fn: string) => {
        calls.push({ table: fn, op: "rpc" });
        return Promise.resolve({ data: validated, error: null });
      },
    }),
  },
}));
jest.mock("@/utils/supabase/webDb", () => ({ signedInPersonId: () => Promise.resolve("person-1") }));

import { buildOfferingItems, fetchOfferingItems, keepOffering } from "../data";

const kept = (id: string, name: string) => ({ id, name, kind: "service", price_note: null, metadata: { migrated_from: "seo.topic" } });
const staged = (id: string, key: string, status: string, resolved: string | null = null) => ({
  id,
  value: { key },
  status,
  resolved_offering_id: resolved,
  context: { certainty: "likely", candidate: { key, name: key, kind: "service" }, quotes: [] },
});

beforeEach(() => {
  calls.length = 0;
  validated = [];
});

describe("an offering is confirmed only when a person validated it", () => {
  it("a code-minted kept offering is not confirmed and stays answerable", () => {
    const [item] = buildOfferingItems([], [kept("o1", "Electronics recycling")]);
    expect(item.status).toBe("pending");
    expect(item.certainty).not.toBe("confirmed");
    expect(item.offeringId).toBe("o1");
  });

  it("a kept offering a person validated is confirmed", () => {
    const [item] = buildOfferingItems([], [kept("o1", "Electronics recycling")], new Set(["o1"]));
    expect(item.status).toBe("confirmed");
    expect(item.certainty).toBe("confirmed");
  });

  it("a finding a job or a test seat marked confirmed is not the brand's word", () => {
    const items = buildOfferingItems([staged("d1", "battery drop off", "confirmed", "o2")], [kept("o2", "Battery drop-off")]);
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("pending");
  });

  it("the screen reads standing from the database rule", async () => {
    validated = ["o1"];
    await fetchOfferingItems("brand");
    expect(calls.some((c) => c.op === "rpc" && c.table === "person_validated_offering_ids")).toBe(true);
  });
});

describe("Yes on a kept offering records the person's word", () => {
  const brand = { id: "brand", organizationId: "org" };

  it("a kept offering no finding names gets one reviewed finding naming it", async () => {
    const [item] = buildOfferingItems([], [kept("o1", "Electronics recycling")]);
    await keepOffering(brand, item);
    const ins = calls.find((c) => c.table === "discovered_item" && c.op === "insert");
    expect(ins?.payload).toMatchObject({
      organization_id: "org",
      brand_id: "brand",
      category: "offering",
      status: "confirmed",
      resolved_offering_id: "o1",
      reviewed_by: "person-1",
    });
    expect(calls.some((c) => c.table === "brand_offering" && c.op === "insert")).toBe(false);
  });

  it("a kept offering a finding names: the finding is confirmed by the person", async () => {
    const [item] = buildOfferingItems([staged("d1", "electronics recycling", "pending")], [kept("o1", "Electronics recycling")]);
    await keepOffering(brand, item);
    const upd = calls.find((c) => c.table === "discovered_item" && c.op === "update");
    expect(upd?.payload).toMatchObject({ status: "confirmed", resolved_offering_id: "o1", reviewed_by: "person-1" });
    expect(upd?.ids).toEqual(["d1"]);
  });
});
