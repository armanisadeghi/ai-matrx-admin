// features/cx-dashboard/utils/conversation-usage.ts — one conversation's spend, summed from its own
// rows. A user request can fan out across several conversations (parallel agents carry no parent
// link), so a request's total_cost is never one conversation's cost; these sums are.

import type {
  CxConversationUsage,
  CxRelatedConversationCost,
  CxRequest,
  CxToolCall,
} from "../types/cxDashboardTypes";

const num = (v: unknown): number => Number(v) || 0;

/** One model call or tool call's spend, attributed to the conversation it ran in. */
export type SpendRow = { conversation_id: string; cost: number; total_tokens: number; model_call: boolean };

export function relatedCosts(rows: SpendRow[], titles: Map<string, string | null>): CxRelatedConversationCost[] {
  const by = new Map<string, CxRelatedConversationCost>();
  for (const r of rows) {
    const e = by.get(r.conversation_id) ?? { id: r.conversation_id, title: titles.get(r.conversation_id) ?? null, cost: 0, model_calls: 0, total_tokens: 0 };
    e.cost += r.cost;
    e.total_tokens += r.total_tokens;
    if (r.model_call) e.model_calls += 1;
    by.set(r.conversation_id, e);
  }
  return [...by.values()].sort((a, b) => b.cost - a.cost);
}

export function summarizeConversationUsage(
  modelCalls: CxRequest[],
  toolCalls: CxToolCall[],
  siblings: CxRelatedConversationCost[],
  subAgents: CxRelatedConversationCost[],
): CxConversationUsage {
  const totals: CxConversationUsage["totals"] = {
    cost: 0, model_cost: 0, tool_cost: 0, model_calls: modelCalls.length, tool_calls: toolCalls.length,
    input_tokens: 0, output_tokens: 0, cached_tokens: 0, total_tokens: 0,
    api_duration_ms: 0, tool_duration_ms: 0, failed_tool_calls: 0, max_tokens_hits: 0,
  };
  const byModel = new Map<string, CxConversationUsage["by_model"][number] & { duration_sum: number }>();
  const share: CxConversationUsage["share_by_request"] = {};

  for (const r of modelCalls) {
    const cost = num(r.cost);
    const tokens = num(r.total_tokens);
    totals.model_cost += cost;
    totals.input_tokens += num(r.input_tokens);
    totals.output_tokens += num(r.output_tokens);
    totals.cached_tokens += num(r.cached_tokens);
    totals.total_tokens += tokens;
    totals.api_duration_ms += num(r.api_duration_ms);
    if (r.finish_reason === "max_tokens") totals.max_tokens_hits += 1;

    const name = r.model_name ?? "Unknown model";
    const m = byModel.get(name) ?? {
      model_name: name, provider: r.provider ?? "Unknown", calls: 0, cost: 0,
      input_tokens: 0, output_tokens: 0, cached_tokens: 0, total_tokens: 0, avg_duration_ms: 0, duration_sum: 0,
    };
    m.calls += 1;
    m.cost += cost;
    m.input_tokens += num(r.input_tokens);
    m.output_tokens += num(r.output_tokens);
    m.cached_tokens += num(r.cached_tokens);
    m.total_tokens += tokens;
    m.duration_sum += num(r.api_duration_ms);
    byModel.set(name, m);

    if (r.user_request_id) {
      const s = (share[r.user_request_id] ??= { cost: 0, model_calls: 0, total_tokens: 0 });
      s.cost += cost;
      s.model_calls += 1;
      s.total_tokens += tokens;
    }
  }

  const byTool = new Map<string, CxConversationUsage["by_tool"][number] & { duration_sum: number }>();
  for (const t of toolCalls) {
    const cost = num(t.cost_usd);
    const failed = t.is_error === true || t.success === false;
    totals.tool_cost += cost;
    totals.tool_duration_ms += num(t.duration_ms);
    if (failed) totals.failed_tool_calls += 1;
    const e = byTool.get(t.tool_name) ?? { tool_name: t.tool_name, calls: 0, errors: 0, cost: 0, avg_duration_ms: 0, duration_sum: 0 };
    e.calls += 1;
    e.cost += cost;
    e.duration_sum += num(t.duration_ms);
    if (failed) e.errors += 1;
    byTool.set(t.tool_name, e);
    if (t.user_request_id) {
      const s = (share[t.user_request_id] ??= { cost: 0, model_calls: 0, total_tokens: 0 });
      s.cost += cost;
    }
  }
  totals.cost = totals.model_cost + totals.tool_cost;

  return {
    totals,
    by_model: [...byModel.values()]
      .map(({ duration_sum, ...m }) => ({ ...m, avg_duration_ms: m.calls ? duration_sum / m.calls : 0 }))
      .sort((a, b) => b.cost - a.cost),
    by_tool: [...byTool.values()]
      .map(({ duration_sum, ...t }) => ({ ...t, avg_duration_ms: t.calls ? duration_sum / t.calls : 0 }))
      .sort((a, b) => b.cost - a.cost || b.calls - a.calls),
    share_by_request: share,
    siblings,
    sub_agents: subAgents,
  };
}

