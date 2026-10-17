/**
 * Background AI reaches Watch AI and the Builder through ONE door (followed-work.ts).
 * Forcing: registering is idempotent and survives a reload; a factory build / eval run resolves to
 * the AI calls it made; those calls form their own rail group named for the work; the Builder gets
 * inputs, progress and one AI-calls entry per step; and every place that STARTS server work
 * registers it (guard scan — a new door that forgets fails here).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { followServerWork, getFollowedWork, resetFollowedWork } from "../followed-work";
import { resolveFactoryBuild, resolveTestRun } from "../followed-work-resolve";
import { followedSummaries } from "../ai-watch-records";
import { buildRail, railGroupHeading } from "../watch-rail";
import { pageRunEntries, serverWorkEntries } from "../followed-work-builder";
import type { FactoryBuildState } from "@/features/agents/factory/types";
import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";

const build: FactoryBuildState = {
  build_id: "b1",
  status: "running",
  current_step: "instructions",
  request: { spec: { name: "x" }, door: "studio" },
  history: [
    { step: "contract", attempt: 1, status: "done", mandate_key: "agent_factory.contract", request_id: "ur-1", conversation_id: "c-1", answer: { ok: 1 } },
  ],
  steps: {
    contract: { step: "contract", attempt: 1, status: "done", mandate_key: "agent_factory.contract", request_id: "ur-1", conversation_id: "c-1", answer: { ok: 1 } },
    goal: { step: "goal", attempt: 1, status: "running", mandate_key: "agent_factory.goal", request_id: "ur-2", conversation_id: "c-2" },
  },
  proof: [{ case_id: "k1", candidate_output: "hi", candidate_conversation_id: "c-3" }],
};

describe("followed server work", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetFollowedWork();
  });

  it("registers once and survives in storage", () => {
    followServerWork({ kind: "factory_build", id: "b1", label: "Agent Factory build", source: "Studio" });
    followServerWork({ kind: "factory_build", id: "b1", label: "Agent Factory build", source: "Studio" });
    expect(getFollowedWork()).toHaveLength(1);
    expect(JSON.parse(window.sessionStorage.getItem("matrx:ai-watch:followed") ?? "[]")).toHaveLength(1);
  });

  it("a factory build resolves to every call it made, step answers included", () => {
    const r = resolveFactoryBuild({ key: "factory_build:b1", id: "b1" }, build, "running");
    expect(r.userRequestIds.sort()).toEqual(["ur-1", "ur-2"]);
    expect(r.conversationIds.sort()).toEqual(["c-1", "c-2", "c-3"]);
    expect(r.done).toBe(false);
    expect(r.steps.map((s) => s.id)).toEqual(expect.arrayContaining(["contract.1", "goal.1", "proof.k1"]));
    expect(resolveFactoryBuild({ key: "k", id: "b1" }, { ...build, outcome: "passed" }, "completed").done).toBe(true);
  });

  it("an eval run resolves to its case results' calls", () => {
    const r = resolveTestRun({ key: "test_run:t1", id: "t1" }, { status: "running" }, [
      { id: "r1", case_id: "c", status: "done", verdict: "pass", verdict_reason: null, conversation_id: "c-9", user_request_ids: ["ur-9"] },
    ]);
    expect(r.userRequestIds).toEqual(["ur-9"]);
    expect(r.steps[0].status).toBe("pass");
  });

  it("the work's calls are their own rail group, headed by the work", () => {
    const scopes = [{ key: "factory_build:b1", label: "Agent Factory build", userRequestIds: ["ur-1"], conversationIds: ["c-2"] }];
    const rows = [
      { id: "ur-1", status: "complete", created_at: "2026-10-17T00:00:01Z", conversation_id: "c-1", origin_class: "system", metadata: { mandate_key: "agent_factory.contract" } },
      { id: "ur-2", status: "running", created_at: "2026-10-17T00:00:02Z", conversation_id: "c-2", origin_class: "system", metadata: {} },
    ];
    const summaries = followedSummaries(rows, scopes);
    const groups = buildRail([], summaries);
    expect(groups).toHaveLength(1);
    expect(groups[0].calls.map((c) => c.key)).toEqual(["ur-1", "ur-2"]);
    expect(railGroupHeading(groups[0], null)).toBe("Agent Factory build");
  });

  it("the Builder gets inputs, progress and an AI-calls entry per step", () => {
    const w = { key: "factory_build:b1", kind: "factory_build" as const, id: "b1", label: "Agent Factory build", source: "Studio", at: 1 };
    const entries = serverWorkEntries([w], { [w.key]: resolveFactoryBuild(w, build, "running") });
    const keys = entries.map((e) => e.key);
    expect(keys).toEqual(expect.arrayContaining(["work.factory_build:b1.progress", "work.factory_build:b1.inputs", "work.factory_build:b1.step.goal.1"]));
    const goal = entries.find((e) => e.key.endsWith("step.goal.1"));
    expect(goal?.group).toBe("ai");
    expect(goal?.ref).toMatchObject({ type: "ai_run", userRequestId: "ur-2", conversationId: "c-2" });
    // Not yet read: still announced.
    expect(serverWorkEntries([w], {})[0].data).toMatchObject({ status: "reading" });
  });

  it("every AI run the tab holds becomes an AI-calls entry", () => {
    const run = { key: "ur-5", serverRequestId: "ur-5", requestIds: ["rq"], conversationId: "cv", mandateRun: null, live: true, startedAt: "t" } as unknown as WatchableRun;
    const [e] = pageRunEntries([run]);
    expect(e.group).toBe("ai");
    expect(e.ref).toMatchObject({ type: "ai_run", requestId: "rq", userRequestId: "ur-5", conversationId: "cv" });
  });

  it("GUARD: every file that starts server AI work follows it", () => {
    const roots = ["features", "app", "lib"];
    const starters = ['"/agent-factory/builds"', '"/agent-factory/builds",', "/agent-tests/runs\"", "agent_factory_build"];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "__tests__" || name === ".next") continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name) && !full.includes(".test.")) {
          const text = readFileSync(full, "utf8");
          const starts = text.includes('postJson<{ build_id: string }>') || text.includes('p: "/agent-tests/runs",') || text.includes('path: "/agent-studio/from-chat"');
          if (starts && !text.includes("followServerWork")) offenders.push(full);
        }
      }
    };
    void starters;
    for (const r of roots) walk(join(process.cwd(), r));
    expect(offenders).toEqual([]);
  });
});
