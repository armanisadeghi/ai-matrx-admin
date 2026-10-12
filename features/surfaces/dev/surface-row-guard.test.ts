jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/claimsUser", () => ({ getClaimsUser: jest.fn() }));
jest.mock("@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext", () => ({ getGlobalSurfaceRegistry: jest.fn() }));
jest.mock("@ai-matrx/chat/surfaces/services/surfaces.service", () => ({ getSurfaceByName: jest.fn() }));
import { findMissingSurfaceRows, makeSurfaceExists } from "./surface-row-guard";

describe("surface row guard", () => {
  it("names a mounted surface whose row is missing, once", async () => {
    const seen = new Set<string>();
    const exists = async (n: string) => n !== "matrx-user/ghost";
    expect(await findMissingSurfaceRows(["matrx-user/chat", "matrx-user/ghost"], exists, seen)).toEqual(["matrx-user/ghost"]);
    expect(await findMissingSurfaceRows(["matrx-user/ghost"], exists, seen)).toEqual([]);
  });
  it("passes when every row exists", async () => {
    expect(await findMissingSurfaceRows(["matrx-user/chat"], async () => true, new Set())).toEqual([]);
  });
});

describe("a signed-out visitor", () => {
  it("never triggers the ui_surface lookup, and is asked again later", async () => {
    const lookup = jest.fn(async () => null);
    const seen = new Set<string>(["matrx-user/canvas"]);
    const exists = makeSurfaceExists(lookup, async () => false, seen);
    expect(await exists("matrx-user/canvas")).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
    expect(seen.has("matrx-user/canvas")).toBe(false);
  });
  it("still reports a missing row when signed in", async () => {
    const exists = makeSurfaceExists(async () => null, async () => true, new Set());
    expect(await exists("matrx-user/ghost")).toBe(false);
  });
});
