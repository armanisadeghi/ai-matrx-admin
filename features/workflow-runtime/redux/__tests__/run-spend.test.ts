/**
 * Smart Add showed "Free so far" after paid profile lookups (PEOPLE-AND-CREATORS §10, Dr. Sandra Lee run
 * 7efd90c1): the cost line summed only the steps it displayed. selectRunSpendUsd counts EVERY paid step of a
 * run: the AI usage total plus each non-AI step's own `cost_usd`, an AI step counted once.
 */
import { selectRunSpendUsd } from "@/features/workflow-runtime/redux/workflow-runs.selectors";

function stateWith(nodes: Record<string, { output: Record<string, unknown> | null }>, costTotalUsd: number) {
  return { workflowRuns: { byRunId: { r1: { nodes, costTotalUsd } } } } as unknown as Parameters<
    ReturnType<typeof selectRunSpendUsd>
  >[0];
}

describe("selectRunSpendUsd", () => {
  it("counts the anchor searches and profile lookups, not only the displayed steps", () => {
    const state = stateWith(
      {
        "person_anchor_search:1:1": { output: { cost_usd: 0.015 } },
        "person_anchor_extract:2:1": { output: { cost_usd: 0.012 } },
        "probe:1:1": { output: { cost_usd: 0 } },
        "skipped:1:1": { output: null },
      },
      0,
    );
    expect(selectRunSpendUsd("r1")(state)).toBeCloseTo(0.027, 6);
  });

  it("adds the AI usage total once and never double-counts an AI step", () => {
    const state = stateWith(
      {
        "person_facts:3:1": { output: { usage: { cost_usd: 0.03 }, cost_usd: 0.03 } },
        "socials:1:1": { output: { cost_usd: 0.002 } },
      },
      0.03,
    );
    expect(selectRunSpendUsd("r1")(state)).toBeCloseTo(0.032, 6);
  });

  it("is zero for an unknown run", () => {
    expect(selectRunSpendUsd("nope")(stateWith({}, 0))).toBe(0);
  });
});
