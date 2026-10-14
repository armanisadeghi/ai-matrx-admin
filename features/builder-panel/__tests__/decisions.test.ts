/**
 * The Decisions view: each round's stored path decision (aidream brand.identify.path_decision) read as stored,
 * the round's skipped steps with their reasons, costs per path, and the run story's run row naming the path.
 */
import { buildDecisions, costByPath, parsePathDecision, runPathLabel, thresholdText } from "../decisions";
import { buildStory } from "../story";
import type { NodeOutcomeRow, RunTruth } from "../data";

const decision = {
  subject: "person",
  subject_source: "the Person toggle",
  path: "person_harder",
  label: "Person · harder",
  status: "rules_only",
  built: false,
  runs_as: "person_easy",
  why: "first passing entry check",
  measured: true,
  round_kind: "find",
  signals: [
    { key: "directory_page", label: "Same-name directory page", value: "https://www.linkedin.com/pub/dir/A/B", threshold: null, op: "present", fired: true, source: "every anchor search" },
    { key: "reference_rank", label: "Reference page rank", value: null, threshold: 3, op: "<=", fired: false, source: "x" },
  ],
  checks: [
    { path: "person_easy", passed: false, because: ["reference_rank"] },
    { path: "person_harder", passed: true, because: ["not dominant or crowded"] },
  ],
  escalation: null,
  thresholds_source: "default",
  flag: "Person · harder: rules written, behaviours not built — this round runs the Person · easy rules",
};

function outcome(id: string, runId: string, nodeId: string, output: Record<string, unknown>): NodeOutcomeRow {
  return { id, runId, nodeId, step: 0, attempt: 1, itemIndex: 0, completedAt: "2026-10-14T10:00:00.000Z", durationMs: 5, input: null, output: output as never, error: null };
}

const truth: RunTruth = {
  runs: [
    { id: "r1", definitionId: "d1", status: "completed", createdAt: "2026-10-14T10:00:00.000Z", startedAt: "2026-10-14T10:00:00.000Z", completedAt: "2026-10-14T10:00:05.000Z", input: {} },
    { id: "r2", definitionId: "d1", status: "completed", createdAt: "2026-10-14T10:01:00.000Z", startedAt: "2026-10-14T10:01:00.000Z", completedAt: "2026-10-14T10:01:05.000Z", input: {} },
  ],
  outcomes: [
    outcome("o1", "r1", "path_decision", { path: "person_harder", runs_as: "person_easy", path_decision: decision }),
    outcome("o2", "r1", "person_anchor_search", { cost_usd: 0.035, evidence: [{}] }),
    outcome("o3", "r1", "web", { skipped: true }),
    outcome("o4", "r2", "path_decision", { skipped: true, notes: ["No search and nothing typed this round: the earlier round's path holds."] }),
  ],
  snapshots: [],
  definitions: [
    { id: "d1", name: "Smart Add identify", nodes: [
      { id: "path_decision", label: "Choose the path", icon: "git-fork", readyWhen: [] },
      { id: "person_anchor_search", label: "Search for the person's accounts", icon: null, readyWhen: ["person.find"] },
      { id: "web", label: "Search the web", icon: "search", readyWhen: ["website"] },
    ] },
  ],
};

const runs = [{ runId: "r1", label: "Round 1", at: 1 }, { runId: "r2", label: "Round 2", at: 2 }];

test("each round shows its stored decision, signals vs thresholds, skipped steps and cost", () => {
  const story = buildStory([], runs, truth, []);
  const rounds = buildDecisions(runs, truth, story);
  expect(rounds).toHaveLength(2);
  const [r1, r2] = rounds;
  expect(r1.decision?.path).toBe("person_harder");
  expect(r1.decision?.built).toBe(false);
  expect(r1.decision?.runsAs).toBe("person_easy");
  expect(r1.decision?.flag).toContain("not built");
  expect(r1.decision?.signals.map((s) => [s.key, s.fired])).toEqual([["directory_page", true], ["reference_rank", false]]);
  expect(thresholdText(r1.decision!.signals[1])).toBe("≤ 3");
  expect(r1.skipped).toEqual([{ title: "Search the web", reason: "waits for: a website" }]);
  expect(r1.costUsd).toBeCloseTo(0.035);
  expect(r2.decision).toBeNull();
  expect(r2.missing).toContain("earlier round's path holds");
  expect(costByPath(rounds).map((c) => c.path)).toEqual(["person_harder", "undecided"]);
});

test("the run story's run row names the path", () => {
  expect(runPathLabel(truth, "r1")).toBe("Person · harder (runs as person easy)");
  const story = buildStory([], runs, truth, []);
  expect(story.find((r) => r.id === "run:r1")?.detail).toBe("Smart Add identify · Person · harder (runs as person easy)");
});

test("a record without a path is not a decision", () => {
  expect(parsePathDecision({ subject: "person" })).toBeNull();
});
