/**
 * Spend approvals identity: every row names what it is the way the mandate list does —
 * Feature, Key and the agent's real name — so the board can be sorted and filtered by them.
 *
 * Breaks named: an Agent cell that printed the word "Agent" on every row; a mandate row with no
 * Feature; a plain agent that holds a mandate but shows no Feature; a standalone agent given a guess.
 */
type Result = { data: unknown; error: unknown };

const rpc = jest.fn<Promise<Result>, [string, unknown]>();
const tables: Record<string, Result> = {};

function query(table: string) {
  const chain = {
    select: () => chain,
    in: () => chain,
    is: () => chain,
    order: () => chain,
    then: (resolve: (r: Result) => unknown) => Promise.resolve(tables[table]).then(resolve),
  };
  return chain;
}

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: (schema: string) => ({
      rpc: (fn: string, args: unknown) => rpc(fn, args),
      from: (table: string) => query(`${schema}.${table}`),
    }),
  },
}));

import { fetchSpendApprovals } from "../spendApprovals";

const AGENT_HOLDER = "aaaaaaaa-0000-4000-8000-000000000001";
const AGENT_PLAIN = "aaaaaaaa-0000-4000-8000-000000000002";
const AGENT_YT = "aaaaaaaa-0000-4000-8000-000000000003";

const base = { first_run_cost: 2, first_run_models: [], status: "waiting" };

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (fn) => {
    if (fn === "run_approval_list") {
      return {
        data: [
          { ...base, id: "r1", subject_kind: "mandate", subject_id: "media.youtube_analyzer", subject_name: "YouTube Transcript Analyzer", agent_id: AGENT_YT, mandate_key: "media.youtube_analyzer" },
          { ...base, id: "r2", subject_kind: "agent", subject_id: AGENT_HOLDER, subject_name: "Crisis Holding Statement", agent_id: AGENT_HOLDER, mandate_key: null },
          { ...base, id: "r3", subject_kind: "agent", subject_id: AGENT_PLAIN, subject_name: "Project Copilot", agent_id: AGENT_PLAIN, mandate_key: null },
        ],
        error: null,
      };
    }
    return { data: [], error: null };
  });
  tables["agent.definition"] = {
    data: [
      { id: AGENT_YT, name: "YouTube Video Transcription Analysis" },
      { id: AGENT_HOLDER, name: "Crisis Holding Statement" },
      { id: AGENT_PLAIN, name: "Project Copilot" },
    ],
    error: null,
  };
  tables["mandate.definition"] = {
    data: [{ mandate_key: "seo.reputation_crisis_holding", default_holder_id: AGENT_HOLDER }],
    error: null,
  };
});

test("a mandate row carries its Feature, Key and the agent's real name", async () => {
  const [yt] = await fetchSpendApprovals(null);
  expect(yt.feature).toBe("Media");
  expect(yt.feature_mandate_key).toBe("media.youtube_analyzer");
  expect(yt.agent_name).toBe("YouTube Video Transcription Analysis");
});

test("a plain agent takes the Feature of the mandate it holds; a standalone agent gets none", async () => {
  const rows = await fetchSpendApprovals(null);
  const holder = rows.find((r) => r.id === "r2")!;
  const plain = rows.find((r) => r.id === "r3")!;
  expect(holder.feature_mandate_key).toBe("seo.reputation_crisis_holding");
  expect(holder.feature).toBe("SEO");
  expect(plain.feature_mandate_key).toBeNull();
  expect(plain.feature).toBe("");
});

test("a failed name read leaves the cells blank and still lists every row", async () => {
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  tables["agent.definition"] = { data: null, error: { message: "permission denied" } };
  const rows = await fetchSpendApprovals(null);
  expect(rows).toHaveLength(3);
  expect(rows[0].agent_name).toBeNull();
  expect(spy).toHaveBeenCalledWith("[spend-approvals] agent names unavailable", expect.anything());
  spy.mockRestore();
});
