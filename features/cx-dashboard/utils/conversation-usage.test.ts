import { relatedCosts, summarizeConversationUsage, type SpendRow } from "./conversation-usage";
import type { CxRequest, CxToolCall } from "../types/cxDashboardTypes";

const call = (over: Partial<CxRequest>): CxRequest =>
  ({
    id: "r1", user_request_id: "ur1", conversation_id: "c1", iteration: 1,
    input_tokens: 100, output_tokens: 50, cached_tokens: 10, total_tokens: 150, cost: 0.01,
    api_duration_ms: 1000, tool_duration_ms: null, total_duration_ms: null, tool_calls_count: 0,
    tool_calls_details: null, finish_reason: "stop", response_id: null, ai_model_id: "m1",
    created_at: "2026-10-01T00:00:00Z", deleted_at: null, metadata: {}, model_name: "Model A", provider: "P",
    ...over,
  }) as CxRequest;

const tool = (over: Partial<CxToolCall>): CxToolCall =>
  ({ id: "t1", user_request_id: "ur1", tool_name: "search", cost_usd: 0.002, duration_ms: 200, is_error: false, success: true, ...over }) as CxToolCall;

describe("one conversation's usage", () => {
  // The live case behind this: one user request ran six parallel agents, each in its own conversation
  // with no parent link. The request's total ($0.608675) is not this conversation's cost ($0.077466).
  it("costs only its own model and tool calls, and splits each request into this conversation's share", () => {
    const usage = summarizeConversationUsage(
      [call({ id: "a", cost: 0.077466, total_tokens: 900 })],
      [],
      relatedCosts(
        [0.087436, 0.089459, 0.152887, 0.090862, 0.110565].map(
          (cost, i): SpendRow => ({ conversation_id: `sib${i}`, cost, total_tokens: 1, model_call: true }),
        ),
        new Map([["sib2", "Biggest"]]),
      ),
      [],
    );
    expect(usage.totals.cost).toBeCloseTo(0.077466, 6);
    expect(usage.share_by_request.ur1!.cost).toBeCloseTo(0.077466, 6);
    expect(usage.siblings).toHaveLength(5);
    expect(usage.siblings[0]).toMatchObject({ id: "sib2", title: "Biggest" });
    const all = usage.totals.cost + usage.siblings.reduce((s, c) => s + c.cost, 0);
    expect(all).toBeCloseTo(0.608675, 6);
  });

  it("adds tool cost, groups by model and tool, and counts errors", () => {
    const usage = summarizeConversationUsage(
      [
        call({ id: "a", cost: 0.01, model_name: "Model A" }),
        call({ id: "b", cost: 0.04, model_name: "Model B", finish_reason: "max_tokens", api_duration_ms: 3000 }),
        call({ id: "c", cost: 0.02, model_name: "Model A", user_request_id: "ur2" }),
      ],
      [tool({ id: "t1" }), tool({ id: "t2", tool_name: "fetch", success: false, cost_usd: null })],
      [],
      relatedCosts([{ conversation_id: "child", cost: 0.5, total_tokens: 10, model_call: true }], new Map()),
    );
    expect(usage.totals.model_cost).toBeCloseTo(0.07, 6);
    expect(usage.totals.tool_cost).toBeCloseTo(0.002, 6);
    expect(usage.totals.cost).toBeCloseTo(0.072, 6);
    expect(usage.totals.input_tokens).toBe(300);
    expect(usage.totals.max_tokens_hits).toBe(1);
    expect(usage.totals.failed_tool_calls).toBe(1);
    expect(usage.by_model.map((m) => [m.model_name, m.calls])).toEqual([["Model B", 1], ["Model A", 2]]);
    expect(usage.by_tool.find((t) => t.tool_name === "fetch")).toMatchObject({ calls: 1, errors: 1, cost: 0 });
    expect(usage.share_by_request.ur1!.cost).toBeCloseTo(0.052, 6);
    expect(usage.share_by_request.ur2!.cost).toBeCloseTo(0.02, 6);
    expect(usage.sub_agents).toEqual([{ id: "child", title: null, cost: 0.5, model_calls: 1, total_tokens: 10 }]);
  });
});
