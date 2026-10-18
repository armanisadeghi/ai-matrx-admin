/**
 * Studio testing fixes (adversarial review 2026-10-18): battle results come back on load and the
 * runs list names battles and winners; the Battle cost never shares a truncating row with the runs
 * stepper; the Debrief tab offers a model menu defaulting to the strongest Claude; the Versions
 * list reads in relative time with each version's note.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { battleWinnerText } from "@/features/agent-tests/components/AgentTestTables";
import { toRunView } from "@/features/agent-tests/service";
import type { TestRunView } from "@/features/agent-tests/types";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const run = (over: Partial<TestRunView>): TestRunView =>
  ({ id: "r", pairwiseRounds: 0, battle: null, setupLabels: {}, ...over }) as TestRunView;

describe("runs list names battles", () => {
  it("is a dash for a plain run, Judging until settled, then the winner or Even", () => {
    expect(battleWinnerText(run({}))).toBe("—");
    expect(battleWinnerText(run({ pairwiseRounds: 3, battle: { settled: false, winnerLabel: null } }))).toBe("Judging");
    expect(battleWinnerText(run({ pairwiseRounds: 3, status: "cancelled", battle: { settled: false, winnerLabel: null } }))).toBe("—");
    expect(battleWinnerText(run({ pairwiseRounds: 3, battle: { settled: true, winnerLabel: "Candidate" } }))).toBe("Candidate");
    expect(battleWinnerText(run({ pairwiseRounds: 3, battle: { settled: true, winnerLabel: null } }))).toBe("Even");
  });
  it("reads pairwise rounds and setup labels off the run row", () => {
    const v = toRunView({
      id: "r", organization_id: "o", agent_ids: ["a"], status: "succeeded", door_policy: "random", repeats: 1,
      judge_policy: "x", purpose: "user", ai_test_mode: "real", created_at: "2026-10-18T00:00:00Z",
      started_at: null, finished_at: null, counts: { total: 2, done: 2, pairwise: 2 }, spent_cents: 1,
      max_cost_cents: 10, archived_at: null, setups: [{ key: "live", label: "Live" }, { key: "candidate", label: "Candidate" }],
    } as never);
    expect(v.pairwiseRounds).toBe(2);
    expect(v.setupLabels).toEqual({ live: "Live", candidate: "Candidate" });
  });
});

describe("Studio tabs", () => {
  const battle = read("features/agents/studio/components/StudioBattle.tsx");
  const controls = read("features/agents/studio/components/StudioControls.tsx");
  it("restores the latest battle on load", () => {
    expect(battle).toContain("fetchLatestAgentBattle(agentId)");
  });
  it("keeps the cost on a row that does not truncate, the stepper on its own row", () => {
    const cost = battle.slice(battle.indexOf('data-testid="studio-battle-cost"') - 120, battle.indexOf('data-testid="studio-battle-cost"') + 40);
    expect(cost).not.toContain("truncate");
    expect(battle).toContain('data-testid="studio-battle-repeats-row"');
    const head = battle.slice(battle.indexOf("<TabHead"), battle.indexOf("</TabHead>"));
    expect(head).not.toContain("studio-battle-repeats");
  });
  it("offers a Debrief model menu defaulting to the strongest Claude", () => {
    expect(controls).toContain("defaultDebriefModelId(records)");
    expect(controls).toContain('aria-label="Debrief model"');
  });
  it("shows version age and note", () => {
    expect(controls).toContain("formatDistanceToNow");
    expect(controls).toContain("r.change_note");
  });
});
