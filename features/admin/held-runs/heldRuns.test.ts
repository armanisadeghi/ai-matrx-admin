import {
  heldRunHref,
  replayCostLine,
  replayLaunch,
  requestIdsOf,
  variableRows,
  type HeldRun,
} from "./heldRuns";

jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));

const run = (over: Partial<HeldRun> = {}): HeldRun => ({
  id: "hr-1",
  gate: "protected_account_run_refused",
  refusal_message: "Not run.",
  driver: "system",
  mandate_key: "hindsight.replay_judge",
  door: "run_mandated",
  door_args: null,
  agent_id: "a-1",
  agent_version_id: "v-6",
  agent_name: "Hindsight Replay Judge",
  is_version: false,
  variables: { question: "Better?", subject_content: "B", reference_metrics: { cost: 0.1 } },
  user_input: null,
  context_entries: null,
  model: "claude-sonnet-4-6",
  estimated_cost_usd: 0.0412,
  tools: ["think"],
  messages: [{ role: "system", content: "Judge." }],
  run_user_id: "u-1",
  request_ids: ["r-1"],
  conversation_id: "c-1",
  refs: {},
  occurrence_count: 2,
  last_seen_at: "2026-10-11T04:28:49Z",
  created_at: "2026-10-11T04:07:27Z",
  replays: [],
  ...over,
});

describe("held runs", () => {
  it("replays the same mandate with the frozen inputs, current version by default", () => {
    expect(replayLaunch(run(), "current")).toEqual({
      door: "mandate",
      mandateKey: "hindsight.replay_judge",
      agentId: null,
      versionId: null,
      variables: { question: "Better?", subject_content: "B", reference_metrics: { cost: 0.1 } },
      userInput: undefined,
    });
  });

  it("the original version pins the agent version the run resolved to", () => {
    expect(replayLaunch(run(), "original")).toMatchObject({ door: "agent", agentId: "a-1", versionId: "v-6" });
  });

  it("a run with no mandate replays its agent", () => {
    expect(replayLaunch(run({ mandate_key: null }), "current")).toMatchObject({ door: "agent", agentId: "a-1", versionId: null });
  });

  it("finds held runs by the request ids the alarm occurrences carry", () => {
    expect(requestIdsOf([{ refs: { request_id: "r-1" } }, { refs: {} }, { refs: { request_id: "r-1" } }, { refs: { request_id: "r-2" } }])).toEqual(["r-1", "r-2"]);
  });

  it("states the cost before the click, to the cent", () => {
    expect(replayCostLine(0.0412)).toBe("About $0.04 per replay");
    expect(replayCostLine(0.003)).toBe("About <$0.01 per replay");
    expect(replayCostLine(null)).toBe("Cost not priced");
  });

  it("shows every input as a readable row, structured values as JSON", () => {
    expect(variableRows(run().variables)).toEqual([
      { name: "question", value: "Better?" },
      { name: "subject_content", value: "B" },
      { name: "reference_metrics", value: '{\n  "cost": 0.1\n}' },
    ]);
    expect(heldRunHref("hr-1")).toBe("/administration/billing/held-runs/hr-1");
  });
});
