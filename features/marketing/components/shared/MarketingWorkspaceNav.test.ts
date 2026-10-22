import { resolveActiveRouteMode } from "@/features/shell/components/header/route-mode-match";
import { MARKETING_WORKSPACE_ROUTES } from "./MarketingWorkspaceNav";

describe("MarketingWorkspaceNav", () => {
  it("identifies every workspace that renders the shared navigation", () => {
    for (const route of MARKETING_WORKSPACE_ROUTES) {
      expect(
        resolveActiveRouteMode(MARKETING_WORKSPACE_ROUTES, route.href),
      ).toBe(route);
    }
  });

  it("keeps the cross-site ranks workspace connected", () => {
    expect(
      resolveActiveRouteMode(MARKETING_WORKSPACE_ROUTES, "/marketing/ranks")
        ?.name,
    ).toBe("Ranks");
  });

  it("never has two tabs with the same destination (Sites used to repeat Brands)", () => {
    const hrefs = MARKETING_WORKSPACE_ROUTES.map((r) => r.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(MARKETING_WORKSPACE_ROUTES.map((r) => r.name)).not.toContain("Sites");
  });

  it("the Brands tab is the brands list itself", () => {
    expect(resolveActiveRouteMode(MARKETING_WORKSPACE_ROUTES, "/marketing/brands/all")?.name).toBe("Brands");
  });
});
