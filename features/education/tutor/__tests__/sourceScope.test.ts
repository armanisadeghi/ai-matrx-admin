// The tutor answers from the material you're studying: a study context's
// Sources become the EXACT search corpus; no context (or no Sources) keeps the
// whole-library search. The assembleTutorGrounding case failed before the
// change (it always sent `learner_owned`).

const retrieveGroundedPassages = jest.fn();
const listForEntity = jest.fn();

jest.mock("@/features/rag/api/grounding", () => ({
  retrieveGroundedPassages: (...args: unknown[]) => retrieveGroundedPassages(...args),
  serializeGroundedPassages: () => "",
}));
jest.mock("../learnerMemory", () => ({
  assembleLearnerMemory: async () => ({ summaryText: "", weakAreas: [] }),
}));
jest.mock("../settings", () => ({
  getTutorSettings: () => ({ teachingMode: "Socratic", personalityStyle: "Balanced" }),
}));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { listForEntity: (...args: unknown[]) => listForEntity(...args) },
}));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/features/education/convert/lineage", () => ({
  readArtifactOrigins: async () => [],
}));

import { assembleTutorGrounding, tutorGroundingCorpus } from "../grounding";
import { mapRefsToScopedSources, sourceRefsForContext } from "../sourceScope";

const empty = { status: "empty", passages: [], trust: { citations: [], confidence: "not_in_material", groundedIn: "" } };

beforeEach(() => {
  retrieveGroundedPassages.mockReset().mockResolvedValue(empty);
  listForEntity.mockReset();
});

describe("tutor source scope", () => {
  test("a study context's Sources are the ONLY corpus searched", async () => {
    const sources = [{ sourceKind: "cld_file", sourceId: "file-a", title: "Kit A notes" }];
    await assembleTutorGrounding({ query: "What is mitosis?", userId: "u1", sources });
    expect(retrieveGroundedPassages).toHaveBeenCalledWith(
      expect.objectContaining({ corpus: { mode: "explicit", sources } }),
      { userId: "u1" },
    );
  });

  test("no context, or a context with no Sources, searches the whole library", async () => {
    await assembleTutorGrounding({ query: "q", userId: "u1" });
    await assembleTutorGrounding({ query: "q", userId: "u1", sources: [] });
    for (const call of retrieveGroundedPassages.mock.calls) {
      expect(call[0].corpus).toEqual({ mode: "learner_owned" });
    }
    expect(tutorGroundingCorpus(undefined)).toEqual({ mode: "learner_owned" });
  });

  test("a kit resolves to its filed Sources, mapped onto the index keys", async () => {
    listForEntity.mockResolvedValue({
      ok: true,
      data: {
        edges: [
          { id: "e1", direction: "incoming", otherType: "file", otherId: "f1", label: "Cells.pdf", metadata: { kitSource: true }, createdAt: "2026-01-01", role: "source" },
          { id: "e2", direction: "incoming", otherType: "processed_document", otherId: "pd1", label: "Notes", metadata: { kitSource: true }, createdAt: "2026-01-02", role: "source" },
          // An aid filed in the kit is never a Source.
          { id: "e3", direction: "incoming", otherType: "fc_set", otherId: "deck", label: "Deck", metadata: { educationKit: true }, createdAt: "2026-01-03", role: "member" },
        ],
      },
    });
    const refs = await sourceRefsForContext({ entityType: "scope", entityId: "kit-a" });
    expect(refs.map((r) => `${r.entityType}:${r.entityId}`)).toEqual(["file:f1", "processed_document:pd1"]);

    const scoped = mapRefsToScopedSources(
      refs,
      new Map([["pd1", { id: "pd1", name: "Notes", source_kind: "inline", source_id: "raw-1" }]]),
    );
    expect(scoped.map((s) => s.grounding)).toEqual([
      { sourceKind: "cld_file", sourceId: "f1", title: "Cells.pdf" },
      { sourceKind: "inline", sourceId: "raw-1", title: "Notes" },
    ]);
    // Every chip opens its Source.
    expect(scoped.every((s) => s.href.length > 0)).toBe(true);
  });

  test("a kit read failure throws instead of silently widening", async () => {
    listForEntity.mockResolvedValue({ ok: false, error: new Error("boom") });
    await expect(sourceRefsForContext({ entityType: "scope", entityId: "kit-a" })).rejects.toThrow();
  });

  test("Sources with no index identity are dropped", () => {
    expect(
      mapRefsToScopedSources([{ entityType: "conversation", entityId: "c1", title: null }], new Map()),
    ).toEqual([]);
  });
});
