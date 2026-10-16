import { readFileSync } from "fs";
import { join } from "path";

const rpc = jest.fn();
const schema = jest.fn((_name: string) => ({ rpc }));
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema: (s: string) => schema(s) } }));

import { fetchBriefRunHistory, fetchSiteAiRun, fetchSiteAiRuns, restoreBriefRun } from "./aiRuns";

beforeEach(() => {
  rpc.mockReset();
  schema.mockClear();
});

describe("brief run history is one Supabase RPC, not a server call", () => {
  it("calls plan.brief_run_history with the node id and returns the shape untouched", async () => {
    const shape = { node_id: "n1", runs: [{ run_id: "r1", is_current: true }] };
    rpc.mockResolvedValue({ data: shape, error: null });
    await expect(fetchBriefRunHistory("n1")).resolves.toBe(shape);
    expect(schema).toHaveBeenCalledWith("plan");
    expect(rpc).toHaveBeenCalledWith("brief_run_history", { p_node_id: "n1" });
  });

  it("surfaces a database error instead of an empty list", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Plan node n1 not found." } });
    await expect(fetchBriefRunHistory("n1")).rejects.toThrow("Plan node n1 not found.");
  });

  it("the site history and one run are RPCs too", async () => {
    rpc.mockResolvedValue({ data: { site_id: "s1", runs: [] }, error: null });
    await fetchSiteAiRuns("s1");
    expect(rpc).toHaveBeenCalledWith("site_ai_runs", { p_site_id: "s1" });
    await fetchSiteAiRun("s1", "r1");
    expect(rpc).toHaveBeenCalledWith("site_ai_run", { p_site_id: "s1", p_run_id: "r1" });
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(fetchSiteAiRuns("s1")).rejects.toThrow("boom");
    await expect(fetchSiteAiRun("s1", "r1")).rejects.toThrow("boom");
  });

  it("restoring a run is the plan.restore_brief_run RPC and reports its refusal", async () => {
    rpc.mockResolvedValue({ data: { node_id: "n1", brief: ["a"] }, error: null });
    await restoreBriefRun("n1", "r1");
    expect(rpc).toHaveBeenCalledWith("restore_brief_run", { p_node_id: "n1", p_run_id: "r1" });
    rpc.mockResolvedValue({ data: null, error: { message: "That run produced no brief to restore." } });
    await expect(restoreBriefRun("n1", "r1")).rejects.toThrow("no brief to restore");
  });

  it("the restore call no longer goes to the server", () => {
    const src = readFileSync(join(__dirname, "../hooks/useBriefWriter.ts"), "utf8");
    expect(src).not.toMatch(/brief-runs\/restore/);
  });

  it("the AI-runs hooks no longer ask the server", () => {
    const src = readFileSync(join(__dirname, "../hooks/usePlanAiRuns.ts"), "utf8");
    expect(src).not.toMatch(/callApi/);
    expect(src).not.toMatch(/\/ai-runs/);
  });

  it("the hook no longer asks the server for it", () => {
    const src = readFileSync(join(__dirname, "../hooks/useBriefWriter.ts"), "utf8");
    expect(src).not.toMatch(/\{node_id\}\/brief-runs",/);
  });
});
