/**
 * A signed-out visitor's client carries no session, so comments, links, and feedback reads come back
 * 401 from the database (live /chat 2026-10-22: cmt_list, associations, association_link_sources,
 * output_feedback). With no session each read answers "nothing" without asking.
 */
const asked: string[] = [];
const chain: Record<string, unknown> = new Proxy({}, {
  get: (_t, key) => {
    if (key === "then") return undefined;
    return () => { asked.push(String(key)); return chain; };
  },
});
jest.mock("@/utils/supabase/client", () => ({
  supabase: new Proxy({}, { get: (_t, key) => { asked.push(`supabase.${String(key)}`); return () => chain; } }),
}));
jest.mock("@/lib/supabase/hasBrowserSession", () => ({ hasBrowserSession: async () => false }));
jest.mock("@/features/scopes/host/associationsStore", () => ({ associationsDataSource: {}, getAssociationsStore: () => ({ titles: {} }) }));
jest.mock("@/features/scopes/service/associationsService", () => ({ associationsService: {} }));
jest.mock("@/features/trash/service", () => ({ restoreFromTrash: jest.fn() }));
jest.mock("@/features/access-gate/service/canActOn", () => ({ canActOn: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import { annotationPairs, linkableKinds, listCommentThreads, listEdgeItems } from "../service";
import { listAnchoredThreads } from "../anchored-comments";

const source = { token: "note", id: "n1", title: "", body: "", contentVersion: 0 };

describe("with no session, annotation reads ask the database nothing", () => {
  it("answers empty for threads, edges, link kinds, pairs and anchored threads", async () => {
    expect((await listCommentThreads(source)).items).toEqual([]);
    expect(await listEdgeItems(source, async () => new Map())).toEqual({ highlights: [], links: [] });
    expect(await linkableKinds("note")).toEqual([]);
    expect(await annotationPairs("note")).toEqual({ highlights: false, links: false });
    expect(await listAnchoredThreads("note", "n1")).toEqual([]);
    expect(asked).toEqual([]);
  });
});
