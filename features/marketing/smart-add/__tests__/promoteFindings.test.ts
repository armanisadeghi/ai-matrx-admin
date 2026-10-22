// Arman 2026-10-16: "We are getting all of the competitors identified during the smart add process but then
// they're clearly not being added when you get to the brand page. I'm guessing this is a big problem with a lot
// of things and we need to fix it."
//
// The rules that land a kept finding in its home (competitor, person, location, listing, keyword, backlink,
// offering, industry, typed fact) live ONCE, on the server (aidream services/brand_profile/promote.py, guarded per
// type by tests/test_promote.py), because findings keep arriving after Create and after the person leaves. This
// guard holds the client to that: it calls the one server path at Create and on every confirmed answer, it records
// the session's rounds so the server can land late findings, and it keeps no promotion rule of its own.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const mockPostJson = jest.fn();
jest.mock("@/lib/python-client", () => ({ postJson: (...args: unknown[]) => mockPostJson(...args) }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

import { PROMOTED_TYPES, promotedHomes, promoteSmartAddFindings, toPromoteResult } from "../promote";

const here = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

describe("Smart Add promotion: every census type lands through the ONE server path", () => {
  it("names every census type the server promotes", () => {
    expect([...PROMOTED_TYPES]).toEqual([
      "competitor",
      "person",
      "location",
      "listing",
      "keyword",
      "backlink",
      "offering",
      "industry",
      "typed_fact",
    ]);
  });

  it("asks the server for the brand and reads back what landed per type", async () => {
    mockPostJson.mockResolvedValueOnce({
      data: {
        brand_id: "b1",
        landed: { competitor: 1, person: 2, location: 1, listing: 1, keyword: 1, backlink: 1, offering: 1 },
        already_home: { competitor: 3 },
        kept_on_brand: { competitor: 1 },
        created_ids: { competitor: ["c1"], person: ["a1", "a2"], location: ["l1"], listing: ["ll1"], keyword: ["k1"], backlink: ["bl1"], offering: ["o1"] },
        problems: [],
      },
    });
    const result = await promoteSmartAddFindings("b1");
    expect(mockPostJson).toHaveBeenCalledWith("/brand-intake/promote/b1", {});
    expect(result.landed.person).toBe(2);
    expect(result.landed.typed_fact).toBe(0);
    expect(result.alreadyHome.competitor).toBe(3);
    expect(promotedHomes(result)).toEqual([
      "seo.competitor:c1",
      "platform.associations:a1",
      "platform.associations:a2",
      "web.business_location:l1",
      "web.location_listing:ll1",
      "seo.site_keyword_value:k1",
      "seo.backlink:bl1",
      "web.brand_offering:o1",
    ]);
  });

  it("an empty answer reads as nothing landed (never undefined counts)", () => {
    const r = toPromoteResult({ brand_id: "b", landed: {}, already_home: {}, kept_on_brand: {}, created_ids: {}, problems: [] });
    for (const t of PROMOTED_TYPES) {
      expect(r.landed[t]).toBe(0);
      expect(r.createdIds[t]).toEqual([]);
    }
  });

  it("Create promotes through the server and records every round, so late findings land with no screen open", () => {
    const create = here("SmartAddBrand.tsx");
    expect(create).toMatch(/await promoteSmartAddFindings\(brand\.id\)/);
    expect(create).toMatch(/runs: \[\.\.\.new Set\(\[\.\.\.runIds,/);
  });

  it("every confirmed validation answer promotes through the server, and Undo removes what it created", () => {
    const persist = here("validate/persist.ts");
    // Create's own Yes (createAnswers.ts, `created`) is promoted once by Create itself, never per answer.
    expect(persist).toMatch(/CONFIRMED\.has\(answer\) && !opts\.created \? withPromotion\(ctx, persisted\) : persisted/);
    expect(persist).toMatch(/await undoPromotion\(promoted\.createdIds\)/);
  });

  it("keeps no promotion rule in the client: it never writes a home table to promote", () => {
    const client = here("promote.ts");
    expect(client).not.toMatch(/\.(insert|upsert)\(/);
    for (const file of ["SmartAddBrand.tsx", "validate/persist.ts"]) {
      expect(here(file)).not.toMatch(/livePromoteDeps|PROMOTERS/);
    }
  });
});
