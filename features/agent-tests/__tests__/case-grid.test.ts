import { caseVersionGrid, latestByCase } from "../case-grid";
import type { TestResultView } from "../types";

const r = (id: string, caseId: string, createdAt: string, verdict: TestResultView["verdict"], agentVersionId: string | null) =>
  ({ id, caseId, createdAt, verdict, agentVersionId }) as TestResultView;

describe("reading eval results for the Studio", () => {
  const results = [
    r("1", "c1", "2026-10-17T01:00:00Z", "fail", "v1id"),
    r("2", "c1", "2026-10-17T02:00:00Z", "pass_judged", "v2id"),
    r("3", "c1", "2026-10-17T03:00:00Z", null, "v2id"), // still running
    r("4", "c2", "2026-10-17T01:30:00Z", "pass", "v1id"),
    r("5", "c2", "2026-10-17T04:00:00Z", "inconclusive", null), // version unknown
    r("6", "c2", "2026-10-17T05:00:00Z", "pass", "someone-else"),
  ];

  it("each case's latest finished result", () => {
    const latest = latestByCase(results);
    expect(latest.get("c1")?.id).toBe("2");
    expect(latest.get("c2")?.id).toBe("6");
  });

  it("cases × versions: newest per cell, unknown versions left out", () => {
    const grid = caseVersionGrid(results, new Map([["v1id", 1], ["v2id", 2]]));
    expect(grid.versions).toEqual([2, 1]);
    expect(grid.cell("c1", 1)?.verdict).toBe("fail");
    expect(grid.cell("c1", 2)?.verdict).toBe("pass_judged");
    expect(grid.cell("c2", 1)?.verdict).toBe("pass");
    expect(grid.cell("c2", 2)).toBeNull();
  });
});
