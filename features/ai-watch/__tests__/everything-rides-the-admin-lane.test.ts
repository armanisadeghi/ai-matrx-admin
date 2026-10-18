/**
 * Why a platform admin saw only their own runs in Watch AI · Everything (final review 2026-10-18): the admin arm of RLS
 * (platform_admin_read) is open only on a request that carries the admin lane, and the feed sits on a user page. Every read
 * the feed makes must therefore carry the lane through its registered feature.
 */
const headers: string[][] = [];
function builder(): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "is", "eq", "neq", "or", "lt", "order", "limit", "in"]) b[m] = () => b;
  b.setHeader = (n: string, v: string) => {
    headers.push([n, v]);
    return b;
  };
  b.then = (res: (v: unknown) => void) => res({ data: [], error: null });
  return b;
}
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: () => ({ from: () => builder() }) } }));

import { NO_FILTERS, fetchAgentNames, fetchEverythingNames, fetchEverythingPage } from "../everything-feed";
import { ADMIN_FEATURES_ON_USER_PAGES } from "@/utils/auth/adminFeaturesOnUserPages";

describe("Watch AI Everything reads ride the admin lane", () => {
  beforeEach(() => {
    headers.length = 0;
  });
  it("the page, the people/organization names and the agent names each carry the lane header", async () => {
    await fetchEverythingPage(NO_FILTERS, null);
    await fetchEverythingNames(["p1"], ["o1"]);
    await fetchAgentNames(["a1"]);
    expect(headers.length).toBe(4);
    expect(headers.every(([n, v]) => n === "x-matrx-admin-lane" && v === "1")).toBe(true);
  });
  it("is a registered admin feature with a dated ruling", () => {
    const f = ADMIN_FEATURES_ON_USER_PAGES["ai.watch-everything"];
    expect(f.level).toBe("super_admin");
    expect(f.ruling).toMatch(/2026-10-17/);
  });
});
