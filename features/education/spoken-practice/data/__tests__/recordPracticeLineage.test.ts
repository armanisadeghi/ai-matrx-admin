const linkEdges = jest.fn();
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsHelpers: { linkEdges: (...a: unknown[]) => linkEdges(...a) },
}));

import type { SourceSet } from "@ai-matrx/agents/sources";
import { sourceKey } from "@ai-matrx/agents/sources/runtime";
import { practiceLineageEdges, recordPracticeLineage } from "../recordPracticeLineage";

const ref = (t: string, id: string) => ({ __kind: "resource_ref", resource_type: t, resource_id: id });
const set = (...r: ReturnType<typeof ref>[]) =>
  ({ __kind: "source_set", version: 1, sources: r }) as unknown as SourceSet;
const session = { id: "s1", organization_id: "org1" };

describe("practice session lineage", () => {
  beforeEach(() => linkEdges.mockReset());

  it("one study_session --source--> edge per distinct Source, named from its card", () => {
    const deck = ref("fc_set", "d1");
    const edges = practiceLineageEdges(
      session,
      set(deck, ref("note", "n1"), ref("note", "n1"), ref("processed_document", "p1")),
      { [sourceKey(deck as never)]: { label: "Cells", kind: "records" } },
    );
    expect(edges.map((e) => [e.target.type, e.target.id])).toEqual([
      ["fc_set", "d1"], ["note", "n1"], ["processed_document", "p1"],
    ]);
    expect(edges[0]).toMatchObject({
      source: { type: "study_session", id: "s1" }, role: "source", orgId: "org1", label: "Cells",
    });
  });

  it("skips a kind with no registered pair rather than failing the whole write", () => {
    expect(practiceLineageEdges(session, set(ref("pasted_text", "x"), ref("file", "f1")))).toHaveLength(1);
  });

  it("writes through the bulk door; nothing chosen writes nothing", async () => {
    linkEdges.mockResolvedValue({ ok: true, data: { ids: [] } });
    expect(await recordPracticeLineage(session, set(ref("file", "f1")))).toBeNull();
    expect(linkEdges).toHaveBeenCalledTimes(1);
    expect(await recordPracticeLineage(session, undefined)).toBeNull();
    expect(await recordPracticeLineage(session, set())).toBeNull();
    expect(linkEdges).toHaveBeenCalledTimes(1);
  });

  it("a failed write is returned and logged, never thrown", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    linkEdges.mockResolvedValue({ ok: false, error: "nope" });
    expect(await recordPracticeLineage(session, set(ref("file", "f1")))).toBe("nope");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
