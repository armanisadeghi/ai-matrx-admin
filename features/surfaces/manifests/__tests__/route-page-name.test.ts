/**
 * A PAGE IS NAMED BY ITS OWN ROUTE'S NAVIGATION LABEL (live walk 2026-10-21: the composer chip
 * grouped /marketing/brands/all under "Marketing Hub" — the hub SURFACE's label — not "Brands").
 * SUT: the real `getRoutePageName` over the real navigation (`primaryNavItems`).
 */
import { getRoutePageName } from "../surface-section";

describe("getRoutePageName", () => {
  it("names the Brands list 'Brands', not the Marketing hub", () => {
    expect(getRoutePageName("/marketing/brands/all")).toBe("Brands");
  });
  it("names the hub itself 'Marketing Hub'", () => {
    expect(getRoutePageName("/marketing")).toBe("Marketing Hub");
  });
  it("answers null for a route outside the navigation, never a guess", () => {
    expect(getRoutePageName("/definitely-not-a-route")).toBeNull();
  });
});
