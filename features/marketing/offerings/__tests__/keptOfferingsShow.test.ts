// Creativity Warehouse, 2026-10-16: the brand held 6 kept, confirmed `web.brand_offering` rows (written by the facts
// step at Create) while Products & services and the brand home card read "Found 0 / No products or services found
// yet". The screen read only the run's staged `web.discovered_item` rows. A kept offering is on the list, always —
// and confirmed only when a person validated it (`web.person_validated_offering_ids`; offeringStanding.test.ts).
type Rows = Record<string, unknown[]>;
const tables: Rows = {};
let validated: string[] = [];
function chain(table: string) {
  const q = {
    select: () => q,
    eq: () => q,
    is: () => q,
    order: () => q,
    // every list is read complete (readAllRows): one page, with its exact count
    range: () => Promise.resolve({ data: tables[table] ?? [], error: null, count: (tables[table] ?? []).length }),
  };
  return q;
}
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      from: (t: string) => chain(t),
      rpc: () => Promise.resolve({ data: validated, error: null }),
    }),
  },
}));

import { buildOfferingItems, fetchOfferingItems, offeringMatchKey } from "../data";

const kept = (id: string, name: string, kind = "product") => ({
  id,
  name,
  kind,
  price_note: null,
  metadata: {
    step: "facts",
    decision: "kept",
    certainty: "confirmed",
    found_by: "brand_intake.early_facts",
    reason: `${name} is offered on the official website.`,
    evidence_urls: ["https://creativitywarehouse.com/contact-us"],
  },
});

const staged = (id: string, key: string, status = "pending", resolved: string | null = null) => ({
  id,
  value: { key },
  status,
  resolved_offering_id: resolved,
  context: {
    certainty: "likely",
    candidate: { key, name: key, kind: "service" },
    quotes: [{ url: "https://creativitywarehouse.com/x", quote: key, family: "own_site", source: "nav" }],
  },
});

describe("Products & services shows the brand's kept offerings", () => {
  beforeEach(() => {
    for (const k of Object.keys(tables)) delete tables[k];
  });

  it("kept offerings with no staged rows are found; the person-validated one is confirmed (Creativity Warehouse)", async () => {
    validated = ["o1"];
    tables.discovered_item = [];
    tables.brand_offering = [
      kept("o1", "Art classes", "service"),
      kept("o2", "Birthday parties"),
      kept("o3", "Corporate team building events"),
      kept("o4", "Craft workshops"),
      kept("o5", "Pottery painting sessions"),
      kept("o6", "Studio memberships"),
    ];
    const items = await fetchOfferingItems("brand");
    expect(items).toHaveLength(6);
    expect(items.filter((i) => i.status === "confirmed").map((i) => i.offeringId)).toEqual(["o1"]);
    expect(items.filter((i) => i.status === "pending")).toHaveLength(5);
    expect(items.find((i) => i.name === "Art classes")?.offeringId).toBe("o1");
    expect(items[0].quotes[0].url).toBe("https://creativitywarehouse.com/contact-us");
  });

  it("a staged finding naming a kept offering is one row, confirmed, linked to it", () => {
    const items = buildOfferingItems(
      [staged("d1", "craft workshop"), staged("d2", "pottery")],
      [kept("o4", "Craft workshops")],
      new Set(["o4"]),
    );
    expect(items).toHaveLength(2);
    const craft = items.find((i) => i.key === "craft workshop");
    expect(craft?.status).toBe("confirmed");
    expect(craft?.offeringId).toBe("o4");
    expect(items.find((i) => i.key === "pottery")?.status).toBe("pending");
  });

  it("a staged row already resolved to the offering links by id, not by name", () => {
    const items = buildOfferingItems([staged("d1", "kids camp", "pending", "o9")], [kept("o9", "Summer art camp")], new Set(["o9"]));
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("confirmed");
  });

  it("match keys fold case, punctuation and plural endings, never 'class' → 'clas'", () => {
    expect(offeringMatchKey("Craft Workshops")).toBe(offeringMatchKey("craft workshop"));
    expect(offeringMatchKey("2-Hour Workshops")).toBe("2 hour workshop");
    expect(offeringMatchKey("Glass class")).toBe("glass class");
  });
});
