/**
 * Run on server (Agent Evaluation PLAN P4): each battle column becomes the setup that runs exactly
 * what the column holds — its agent, its model / setting overrides, a synthetic copy's
 * instructions, its pinned version — and a mode the runner cannot carry says why. The score and
 * the judge tally are the ONE battle implementation shared with Agent Studio.
 */
import type { TestResultView } from "@/features/agent-tests/types";
import { battleScore, judgeScore, scoreLine } from "@/features/agent-tests/battle";
import { planBattleTests, withVersionIds, type ColumnFacts } from "../battleTestSetups";
import type { BattleColumnDescriptor } from "../activeBattleColumns";

const col = (over: Partial<BattleColumnDescriptor>): BattleColumnDescriptor => ({
  columnId: "c1",
  conversationId: "conv1",
  agentId: "agent-a",
  agentVersion: "current",
  mode: "model",
  ...over,
});
const none: ColumnFacts = { instanceAgentId: "agent-a", synthetic: null, overrides: null };
const label = (c: BattleColumnDescriptor) => c.label ?? c.columnId;

describe("battle columns → server setups", () => {
  it("a Model column runs its own model; the agent's own model sends no override", () => {
    const facts: Record<string, ColumnFacts> = {
      conv1: none,
      conv2: { ...none, overrides: { model: "gpt-5-mini", temperature: 0.2 } },
    };
    const plan = planBattleTests("model", [col({}), col({ columnId: "c2", conversationId: "conv2" })], (c) => facts[c.conversationId], label);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.caseAgentId).toBe("agent-a");
    expect(plan.setups[0].setup).toEqual({ key: "c1", label: "c1", holder: { kind: "agent", id: "agent-a" }, entry_id: "c1" });
    expect(plan.setups[1].setup.patch).toEqual({ model_id: "gpt-5-mini", settings: { temperature: 0.2 } });
  });

  it("a synthetic copy (System prompt / Tuning / Variations) carries its instructions, settings and model", () => {
    const synth: ColumnFacts = {
      instanceAgentId: "cmp-1",
      synthetic: { messages: [{ role: "system", content: "Be brief." }], settings: { model_id: "x", max_tokens: 50 }, modelId: "m-1" },
      overrides: null,
    };
    const plan = planBattleTests("system-prompt", [col({ mode: "system-prompt" }), col({ columnId: "c2", conversationId: "conv2", mode: "system-prompt" })], (c) => (c.conversationId === "conv2" ? synth : none), label);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.setups[1].setup.patch).toEqual({ messages: [{ role: "system", content: "Be brief." }], settings: { max_tokens: 50 }, model_id: "m-1" });
  });

  it("Open columns keep their own agents; cases come from the first column", () => {
    const plan = planBattleTests("open", [col({ mode: "open" }), col({ columnId: "c2", agentId: "agent-b", mode: "open" })], () => none, label);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.caseAgentId).toBe("agent-a");
    expect(plan.setups.map((s) => s.setup.holder.id)).toEqual(["agent-a", "agent-b"]);
  });

  it("a pinned version rides as its id, and a missing one is refused by name", () => {
    const plan = planBattleTests("model", [col({ agentVersion: 3 }), col({ columnId: "c2" })], () => none, label);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.setups[0].versionNumber).toBe(3);
    const ok = withVersionIds(plan.setups, (a, n) => (a === "agent-a" && n === 3 ? "ver-3" : undefined));
    expect("setups" in ok && ok.setups[0].patch).toEqual({ agent_version_id: "ver-3" });
    expect(withVersionIds(plan.setups, () => undefined)).toEqual({ reason: "Version 3 of c1 was not found" });
  });

  it("a Tools column runs with its tool changes against the source agent, and keeps every door", () => {
    const src = { tools: ["t-search", "t-calc"], customTools: [], mcpServers: [] };
    const facts: Record<string, ColumnFacts> = {
      conv1: { instanceAgentId: "cmp-1", synthetic: { messages: [{ role: "system", content: "x" }], settings: {}, modelId: "m", tools: src }, sourceTools: src, overrides: null },
      conv2: { instanceAgentId: "cmp-2", synthetic: { messages: [{ role: "system", content: "x" }], settings: {}, modelId: "m", tools: { ...src, tools: ["t-calc", "t-mail"] } }, sourceTools: src, overrides: null },
    };
    const plan = planBattleTests("tools", [col({ mode: "tools" }), col({ columnId: "c2", conversationId: "conv2", mode: "tools" })], (c) => facts[c.conversationId], label);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.setups[0].setup.patch).toBeUndefined();
    // No messages / settings: the locked instructions are the agent's own, so the column is not "unsaved".
    expect(plan.setups[1].setup.patch).toEqual({ tools_add: ["t-mail"], tools_remove: ["t-search"] });
  });

  it("a Tools column that changes custom tools or MCP servers says why", () => {
    const src = { tools: [], customTools: [], mcpServers: [] };
    const facts: ColumnFacts = { instanceAgentId: "cmp-1", synthetic: { messages: [], settings: {}, modelId: null, tools: { ...src, mcpServers: ["srv"] } }, sourceTools: src, overrides: null };
    expect(planBattleTests("tools", [col({}), col({ columnId: "c2" })], () => facts, label)).toEqual({ ok: false, reason: "Custom tool and MCP server changes do not reach the server run yet" });
  });

  it("a mode the runner cannot carry says why instead of running something else", () => {
    expect(planBattleTests("conversation", [col({}), col({ columnId: "c2" })], () => none, label).ok).toBe(false);
    expect(planBattleTests("model", [col({})], () => none, label)).toEqual({ ok: false, reason: "Add a second column" });
    expect(planBattleTests("model", [col({ agentId: null }), col({ columnId: "c2" })], () => none, label)).toEqual({ ok: false, reason: "Pick an agent in the first column" });
  });
});

describe("pass/fail and judge per column", () => {
  const r = (over: Partial<TestResultView>) => ({ id: "r", caseId: "k1", setupKey: "c1", door: "manual", verdict: "pass", judgeVerdictId: null, ...over }) as TestResultView;
  it("counts what the judge decided, apart from what the checks settled", () => {
    const results = [
      r({ id: "1" }),
      r({ id: "2", caseId: "k2", verdict: "pass_judged", judgeVerdictId: "j1" }),
      r({ id: "3", setupKey: "c2", verdict: "fail_format", judgeVerdictId: "j2" }),
      r({ id: "4", setupKey: "c2", caseId: "k2", verdict: "fail", judgeVerdictId: "j3" }),
      r({ id: "5", setupKey: "c2", door: "parity", verdict: "fail", judgeVerdictId: "j4" }),
    ];
    expect(judgeScore(results, ["c1", "c2"])).toEqual([
      { key: "c1", judged: 1, holds: 1, format: 0, other: 0 },
      { key: "c2", judged: 2, holds: 0, format: 1, other: 1 },
    ]);
    expect(scoreLine(battleScore(results, ["c1", "c2"]), (k) => (k === "c1" ? "Live" : "Other"))).toBe("Live wins · Live 2/2 · Other 0/2");
  });
});
