/**
 * MKT-043: answering Founder / Key person on the validation page makes the person and links them to the brand —
 * the same path Create uses (relations.linkPersonToBrand) — and Undo takes the link back.
 */
const remove = jest.fn(async () => ({ ok: true }));
const link = jest.fn(async () => ({ partyId: "party-1", home: "platform.associations:owns" }));

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/webDb", () => ({
  authenticatedWebDb: async () => {
    const b: Record<string, unknown> = {};
    for (const m of ["eq", "in", "is", "limit", "select"]) b[m] = () => b;
    b.single = async () => ({ data: { id: "row-1" }, error: null });
    b.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
    return { from: () => ({ select: () => b, insert: () => b, update: () => b }) };
  },
}));
jest.mock("@/features/marketing/data/service", () => ({}));
jest.mock("@/features/education/kits/systemRuns", () => ({ startSystemRun: jest.fn() }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: { remove: (...a: unknown[]) => (remove as (...x: unknown[]) => unknown)(...a) } }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: jest.fn() }));
jest.mock("../siteOwnershipLive", () => ({ liveSiteClaimDeps: jest.fn() }));
jest.mock("../relations", () => ({ linkPersonToBrand: (...a: unknown[]) => (link as (...x: unknown[]) => unknown)(...a) }));

import { persistAnswer, type PersistContext } from "../validate/persist";
import type { FocusItem } from "../validate/queue";

const kinds = [
  { key: "owns", label: "Founder / owner", routesTo: "owns" },
  { key: "key_person", label: "Key person", routesTo: "key_person" },
];
const ctx = { organizationId: "o1", getBrand: () => ({ id: "b1" }), setBrand: jest.fn(), kinds } as unknown as PersistContext;
const page = { key: "web:1", kind: "web", label: "On the web", value: "https://day9.coffee/about", title: "Ritual | day9.coffee", detail: "Meet Jane Roe", platform: null, openUrl: "https://day9.coffee/about", twins: [], evidence: null, fact: null, suggestion: null } as unknown as FocusItem;

describe("MKT-043 founder / key person", () => {
  beforeEach(() => {
    link.mockClear();
    remove.mockClear();
  });

  it("creates the person with the typed name and links them to the brand", async () => {
    const saved = await persistAnswer(ctx, page, "related", { relationKey: "owns", value: "Jane Roe" });
    expect(link).toHaveBeenCalledTimes(1);
    const args = link.mock.calls[0] as unknown[];
    expect(args.slice(0, 4)).toEqual(["o1", "b1", "Jane Roe", { routesTo: "owns", label: "Founder / owner" }]);
    expect(saved.homes).toContain("crm.party:party-1");
    await saved.undo();
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ sourceId: "party-1", targetId: "b1", role: "owns" }));
  });

  it("never saves a page title as the person: no name is a loud failure, not a silent skip", async () => {
    await expect(persistAnswer(ctx, page, "related", { relationKey: "key_person" })).rejects.toThrow(/name/i);
    expect(link).not.toHaveBeenCalled();
  });
});
