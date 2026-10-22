/**
 * PHONE: A PRODUCT'S HOME SHOWS THE MENU, NOT BACK (adversarial review, 2026-10-22). The derived
 * crumbs always carry the product plus the page (two levels), so "more than one crumb" put Back on
 * every product home and the menu button was unreachable there. Depth now comes from the address.
 */
import { liveProducts, phoneCanGoBack } from "../FrameHostImpl";
import { FRAME_ROUTE_HOMES } from "@/features/shell/frame/route-homes.generated";
import { resolveRouteHome } from "@/features/shell/frame/routeHomeLookup";

function at(pathname: string) {
  const home = resolveRouteHome(FRAME_ROUTE_HOMES, pathname);
  const product = liveProducts(home.params).find((p) => p.id === home.productId)!;
  const item = home.itemIndex >= 0 ? product.menu.flatMap((s) => s.items)[home.itemIndex] : undefined;
  return phoneCanGoBack(pathname, product, item);
}

describe("phoneCanGoBack", () => {
  it("a product's home is top level: the menu button", () => {
    expect(at("/memory")).toBe(false);
    expect(at("/notes")).toBe(false);
    expect(phoneCanGoBack("/notes/", { homeHref: "/notes" }, undefined)).toBe(false);
  });

  it("a page deeper than the product's top level gets Back", () => {
    expect(phoneCanGoBack("/notes/4c9a3f8e-2b1d-4e6a-9f00-1a2b3c4d5e6f", { homeHref: "/notes" }, undefined)).toBe(true);
    expect(phoneCanGoBack("/agents/abc/build", { homeHref: "/agents" }, { href: "/agents/all" })).toBe(true);
  });

  it("one of the product's own sidebar rows is top level too", () => {
    expect(phoneCanGoBack("/agents/all", { homeHref: "/agents" }, { href: "/agents/all" })).toBe(false);
  });
});
