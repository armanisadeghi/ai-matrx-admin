// A topical-map read whose honest answer is "none" must come back null — not as
// a red "couldn't read topical-map data" error (a site that uses no map yet).

const rpc = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: () => ({ rpc }) },
}));
jest.mock("@/utils/supabase/webDb", () => ({
  requireAuthenticatedSupabaseSession: jest.fn(async () => undefined),
}));

import { mapFacetValueRef, siteMapId } from "./data";

describe("topical-map nullable reads", () => {
  beforeEach(() => rpc.mockReset());

  it("siteMapId returns null for a site that uses no map", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(siteMapId("site-1")).resolves.toBeNull();
  });

  it("siteMapId returns the map id when one is attached", async () => {
    rpc.mockResolvedValue({ data: "map-1", error: null });
    await expect(siteMapId("site-1")).resolves.toBe("map-1");
  });

  it("siteMapId still throws a refusal (42501) — a refusal is never a null", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "site_map_denied: no viewer access to this site" },
    });
    await expect(siteMapId("site-1")).rejects.toThrow();
  });

  it("mapFacetValueRef returns null when the value points at nothing", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(mapFacetValueRef("value-1")).resolves.toBeNull();
  });
});
