import { brandSwitchHref } from "./brand-switch";

describe("brandSwitchHref — same route on the new brand, degraded only when entity-scoped", () => {
  it("keeps static section routes verbatim", () => {
    expect(brandSwitchHref("vasaro", "/marketing/brands/acme/identity/media/generate")).toBe(
      "/marketing/brands/vasaro/identity/media/generate",
    );
    expect(brandSwitchHref("vasaro", "/marketing/brands/acme/settings")).toBe(
      "/marketing/brands/vasaro/settings",
    );
    expect(brandSwitchHref("vasaro", "/marketing/brands/acme/intelligence/competitors")).toBe(
      "/marketing/brands/vasaro/intelligence/competitors",
    );
    expect(brandSwitchHref("vasaro", "/marketing/brands/acme")).toBe("/marketing/brands/vasaro");
  });

  it("degrades site-scoped branches to the branch door", () => {
    expect(
      brandSwitchHref(
        "vasaro",
        "/marketing/brands/acme/seo/acme-com/keywords/value/rules",
      ),
    ).toBe("/marketing/brands/vasaro/seo");
    expect(
      brandSwitchHref("vasaro", "/marketing/brands/acme/websites/acme-com/pages/p-1"),
    ).toBe("/marketing/brands/vasaro/websites");
    expect(
      brandSwitchHref("vasaro", "/marketing/brands/acme/content/plan/acme-com/table"),
    ).toBe("/marketing/brands/vasaro/content/plan");
    expect(
      brandSwitchHref("vasaro", "/marketing/brands/acme/locations/loc-1"),
    ).toBe("/marketing/brands/vasaro/locations");
    expect(
      brandSwitchHref("vasaro", "/marketing/brands/acme/planning/initiatives/i-1"),
    ).toBe("/marketing/brands/vasaro/planning/initiatives");
    expect(
      brandSwitchHref("vasaro", "/marketing/brands/acme/intelligence/reputation/acme-com"),
    ).toBe("/marketing/brands/vasaro/intelligence/reputation");
  });

  it("keeps branch DOORS themselves verbatim", () => {
    expect(brandSwitchHref("vasaro", "/marketing/brands/acme/seo")).toBe(
      "/marketing/brands/vasaro/seo",
    );
    expect(brandSwitchHref("vasaro", "/marketing/brands/acme/content/plan")).toBe(
      "/marketing/brands/vasaro/content/plan",
    );
  });

  it("carries the query minus entity-selection params", () => {
    expect(
      brandSwitchHref(
        "vasaro",
        "/marketing/brands/acme/identity/knowledge",
        "?site=acme-com&view=map",
      ),
    ).toBe("/marketing/brands/vasaro/identity/knowledge?view=map");
  });
});
