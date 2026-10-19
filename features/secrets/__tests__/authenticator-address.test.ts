/**
 * /vault/authenticator opens the Authenticator itself (2026-10-19 restore): the shared workspace on
 * its codes view, never an item named "authenticator", and the address stays there while it is open.
 */
import { DEFAULT_LOCATION } from "@ai-matrx/vault";
import { AUTHENTICATOR_PATH, locationFromAddress, vaultHref } from "../components/WebVault";

describe("the Authenticator's own address", () => {
  it("opens the workspace on the Authenticator, with no item open", () => {
    const loc = locationFromAddress(AUTHENTICATOR_PATH, "");
    expect(loc.view).toBe("authenticator");
    expect(loc.itemId).toBeNull();
  });

  it("keeps a search typed there", () => {
    expect(locationFromAddress(AUTHENTICATOR_PATH, "q=google").q).toBe("google");
  });

  it("stays at /vault/authenticator while the Authenticator is open, and moves to the item's page when one opens", () => {
    const here = { ...DEFAULT_LOCATION, view: "authenticator", q: "goo" };
    expect(vaultHref(here, new URLSearchParams())).toBe("/vault/authenticator?q=goo");
    expect(vaultHref({ ...here, itemId: "abc" }, new URLSearchParams())).toMatch(/^\/vault\/abc\?/);
  });

  it("still reads /vault/<id> as an item", () => {
    expect(locationFromAddress("/vault/abc", "").itemId).toBe("abc");
  });
});
