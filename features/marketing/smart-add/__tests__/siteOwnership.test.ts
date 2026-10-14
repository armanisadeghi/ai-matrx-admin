// Create on an already-tracked domain must leave the existing brand's site intact (2026-10-14: a
// Create of "Ritual Coffee Roasters" took ritualcoffee.com from "Ritual Coffee Enrich Test").
// Fails if claimSite ever reassigns the site (its brand_id changes) or drops the new brand's own row.
import type { MarketingSite } from "@/features/marketing/types";
import { claimSite, type SiteClaimDeps } from "../siteOwnership";

const OLD = "319a779d-0000-0000-0000-000000000001";
const NEW = "5176c85e-0000-0000-0000-000000000002";
const site = (brand_id: string) => ({ id: "site-1", brand_id, domain: "ritualcoffee.com" }) as unknown as MarketingSite;

function deps(existingBrand: string, names: Record<string, string> = { [OLD]: "Ritual Coffee Enrich Test" }) {
  const state = { siteBrand: existingBrand, properties: [] as unknown[] };
  const d: SiteClaimDeps = {
    createSite: async () => site(state.siteBrand), // the RPC returns the existing record untouched
    createWebsiteProperty: async (p) => void state.properties.push(p),
    brandName: async (id) => names[id] ?? null,
  };
  return { d, state };
}
const input = { organizationId: "org", brandId: NEW, rootUrl: "https://ritualcoffee.com/", host: "ritualcoffee.com" };

describe("claimSite on an already-tracked domain", () => {
  it("never moves the site: it stays with the brand that tracks it", async () => {
    const { d, state } = deps(OLD);
    const claim = await claimSite(d, input);
    expect(state.siteBrand).toBe(OLD);
    expect(claim.kind).toBe("tracked-elsewhere");
    if (claim.kind === "tracked-elsewhere") {
      expect(claim.site.brand_id).toBe(OLD);
      expect(claim.note).toBe("ritualcoffee.com: Already tracked under Ritual Coffee Enrich Test");
    }
  });

  it("gives the new brand its own website property instead", async () => {
    const { d, state } = deps(OLD);
    await claimSite(d, input);
    expect(state.properties).toEqual([{ organizationId: "org", brandId: NEW, url: "https://ritualcoffee.com/", displayName: "ritualcoffee.com" }]);
  });

  it("names it plainly when the other brand is not visible", async () => {
    const { d } = deps(OLD, {});
    const claim = await claimSite(d, input);
    expect(claim.kind === "tracked-elsewhere" && claim.note).toBe("ritualcoffee.com: Already tracked under another brand");
  });

  it("a fresh or own site is simply this brand's", async () => {
    const { d, state } = deps(NEW);
    expect((await claimSite(d, input)).kind).toBe("own");
    expect(state.properties).toEqual([]);
  });
});
