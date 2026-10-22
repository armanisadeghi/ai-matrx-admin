import { resolveMarketingSidebarContext } from "./sidebar-site-context";

describe("resolveMarketingSidebarContext", () => {
  it("agency plane and reserved segments resolve to the agency menu", () => {
    expect(resolveMarketingSidebarContext("/marketing")).toEqual({
      kind: "agency",
    });
    for (const path of [
      "/marketing/brands",
      "/marketing/brands/new-website",
      "/marketing/reports/cost",
      "/marketing/operations/connections/google",
      "/marketing/tools/youtube",
      "/marketing/sites/some-site",
      "/marketing/content-plan/site-1",
    ]) {
      expect(resolveMarketingSidebarContext(path).kind).toBe("agency");
    }
  });

  it("a brand segment resolves to the brand menu", () => {
    expect(resolveMarketingSidebarContext("/marketing/brands/acme")).toEqual({
      kind: "brand",
      brandSeg: "acme",
    });
    expect(
      resolveMarketingSidebarContext("/marketing/brands/acme/identity/media"),
    ).toEqual({ kind: "brand", brandSeg: "acme" });
    expect(
      resolveMarketingSidebarContext(
        "/marketing/brands/1b8f0f9e-0000-4000-8000-000000000000/settings",
      ).kind,
    ).toBe("brand");
  });

  it("the websites branch resolves to the website menu", () => {
    expect(
      resolveMarketingSidebarContext(
        "/marketing/brands/acme/websites/acme-com/pages/p-1",
      ),
    ).toEqual({ kind: "website", brandSeg: "acme", siteSeg: "acme-com" });
    // The websites LIST (no site yet) stays on the brand menu.
    expect(
      resolveMarketingSidebarContext("/marketing/brands/acme/websites").kind,
    ).toBe("brand");
  });

  it("the seo branch resolves to the seo menu", () => {
    expect(
      resolveMarketingSidebarContext(
        "/marketing/brands/acme/seo/acme-com/keywords/value/rules",
      ),
    ).toEqual({ kind: "seo", brandSeg: "acme", siteSeg: "acme-com" });
    expect(resolveMarketingSidebarContext("/marketing/brands/acme/seo").kind).toBe(
      "brand",
    );
  });

  it("a site's content plan and reputation resolve to that website's menu", () => {
    expect(
      resolveMarketingSidebarContext(
        "/marketing/brands/acme/content/plan/acme-com/brief",
      ),
    ).toEqual({ kind: "website", brandSeg: "acme", siteSeg: "acme-com" });
    expect(
      resolveMarketingSidebarContext(
        "/marketing/brands/acme/intelligence/reputation/acme-com/cases",
      ),
    ).toEqual({ kind: "website", brandSeg: "acme", siteSeg: "acme-com" });
    // The brand-level pickers stay on the brand menu.
    expect(
      resolveMarketingSidebarContext("/marketing/brands/acme/content/plan").kind,
    ).toBe("brand");
    expect(
      resolveMarketingSidebarContext("/marketing/brands/acme/intelligence/reputation")
        .kind,
    ).toBe("brand");
  });
});
