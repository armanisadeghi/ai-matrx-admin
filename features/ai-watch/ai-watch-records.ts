/**
 * AI Watch — the recorded side of a watched AI run.
 *
 * Live runs stream through `state.activeRequests` (the client request id). The
 * durable record is the server's own: `chat.user_request` (status, tokens,
 * cost, timing — the SAME numbers the creator panel and agent battles show,
 * computed once by the server) plus `chat.request_snapshot` (the exact
 * provider request and response per iteration). No second cost calculator
 * lives here — this module only reads those rows, under normal RLS.
 */

import { supabase } from "@/utils/supabase/client";

export interface AiWatchSnapshot {
  id: string;
  iteration: number | null;
  provider: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiWatchRecord {
  userRequestId: string;
  status: string | null;
  sourceApp: string | null;
  sourceFeature: string | null;
  agentId: string | null;
  conversationId: string | null;
  workflowRunId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  totalCost: number | null;
  totalDurationMs: number | null;
  apiDurationMs: number | null;
  ttftMs: number | null;
  iterations: number | null;
  toolCalls: number | null;
  finishReason: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  mandateKey: string | null;
  models: string[];
  snapshots: AiWatchSnapshot[];
}

export interface AiWatchRunSummary {
  userRequestId: string;
  label: string;
  status: string | null;
  createdAt: string;
}

const USER_REQUEST_COLUMNS =
  "id, status, source_app, source_feature, agent_id, conversation_id, workflow_run_id, total_input_tokens, total_output_tokens, total_cached_tokens, total_cost, total_duration_ms, api_duration_ms, iterations, total_tool_calls, finish_reason, error, created_at, completed_at, metadata";

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** `user_request.error` is often a JSON envelope; show its message. */
function errorMessage(v: unknown): string | null {
  const text = str(v);
  if (!text || !text.startsWith("{")) return text;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return str(parsed.user_message) ?? str(parsed.message) ?? text;
  } catch {
    return text;
  }
}

function toRecord(row: Row, snapshots: AiWatchSnapshot[]): AiWatchRecord {
  const metadata = obj(row.metadata) ?? {};
  const usageByModel = obj(metadata.usage_by_model) ?? {};
  return {
    userRequestId: String(row.id),
    status: str(row.status),
    sourceApp: str(row.source_app),
    sourceFeature: str(row.source_feature),
    agentId: str(row.agent_id) ?? str(obj(metadata.mandate_holder)?.agent_id),
    conversationId: str(row.conversation_id),
    workflowRunId: str(row.workflow_run_id),
    inputTokens: num(row.total_input_tokens),
    outputTokens: num(row.total_output_tokens),
    cachedTokens: num(row.total_cached_tokens),
    totalCost: num(row.total_cost),
    totalDurationMs: num(row.total_duration_ms),
    apiDurationMs: num(row.api_duration_ms),
    ttftMs: num(metadata.ttft_ms),
    iterations: num(row.iterations),
    toolCalls: num(row.total_tool_calls),
    finishReason: str(row.finish_reason),
    error: errorMessage(row.error),
    createdAt: String(row.created_at ?? ""),
    completedAt: str(row.completed_at),
    mandateKey: str(metadata.mandate_key),
    models: Object.keys(usageByModel),
    snapshots,
  };
}

/** One recorded run, by its server id (`chat.user_request.id`). */
export async function fetchAiWatchRecord(
  userRequestId: string,
): Promise<AiWatchRecord | null> {
  const [ur, snaps] = await Promise.all([
    supabase
      .schema("chat")
      .from("user_request")
      .select(USER_REQUEST_COLUMNS)
      .eq("id", userRequestId)
      .maybeSingle(),
    supabase
      .schema("chat")
      .from("request_snapshot")
      .select("id, iteration, provider, request_payload, response_payload, created_at")
      .eq("user_request_id", userRequestId)
      .is("deleted_at", null)
      .order("iteration", { ascending: true }),
  ]);
  if (ur.error) throw new Error(ur.error.message);
  if (snaps.error) throw new Error(snaps.error.message);
  if (!ur.data) return null;
  const snapshots: AiWatchSnapshot[] = ((snaps.data ?? []) as Row[]).map((s) => ({
    id: String(s.id),
    iteration: num(s.iteration),
    provider: str(s.provider),
    requestPayload: obj(s.request_payload),
    responsePayload: obj(s.response_payload),
    createdAt: String(s.created_at ?? ""),
  }));
  return toRecord(ur.data as Row, snapshots);
}

/** The recorded runs of one flow — a workflow run or a conversation. */
export async function fetchAiWatchRuns(scope: {
  workflowRunId?: string | null;
  conversationId?: string | null;
}): Promise<AiWatchRunSummary[]> {
  let query = supabase
    .schema("chat")
    .from("user_request")
    .select("id, status, source_feature, created_at, metadata")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  if (scope.workflowRunId) query = query.eq("workflow_run_id", scope.workflowRunId);
  else if (scope.conversationId) query = query.eq("conversation_id", scope.conversationId);
  else return [];
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((row, index) => {
    const metadata = obj(row.metadata) ?? {};
    const holder = obj(metadata.mandate_holder);
    return {
      userRequestId: String(row.id),
      label:
        str(holder?.name) ??
        str(metadata.mandate_key) ??
        str(row.source_feature) ??
        `Run ${index + 1}`,
      status: str(row.status),
      createdAt: String(row.created_at ?? ""),
    };
  });
}

/** The parts of a provider request a person reads first. */
export function splitProviderRequest(body: Record<string, unknown> | null): {
  system: unknown;
  messages: unknown[];
  tools: unknown[];
  settings: Record<string, unknown>;
} {
  if (!body) return { system: null, messages: [], tools: [], settings: {} };
  const {
    system,
    systemInstruction,
    system_instruction,
    messages,
    contents,
    input,
    tools,
    ...rest
  } = body as Record<string, unknown>;
  const allMessages = Array.isArray(messages)
    ? messages
    : Array.isArray(contents)
      ? contents
      : Array.isArray(input)
        ? input
        : [];
  // OpenAI-style requests carry the system prompt as the first message(s).
  const systemMessages = allMessages.filter(
    (m) => obj(m)?.role === "system" || obj(m)?.role === "developer",
  );
  const otherMessages = allMessages.filter((m) => !systemMessages.includes(m));
  const explicitSystem = system ?? systemInstruction ?? system_instruction ?? null;
  return {
    system:
      explicitSystem ??
      (systemMessages.length ? systemMessages.map((m) => obj(m)?.content) : null),
    messages: otherMessages,
    tools: Array.isArray(tools) ? tools : [],
    settings: rest,
  };
}

/** The response text of a recorded provider response, best effort across providers. */
export function responseText(body: Record<string, unknown> | null): string {
  if (!body) return "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const parts: string[] = [];
  for (const m of messages) {
    const content = obj(m)?.content;
    if (typeof content === "string") parts.push(content);
    else if (Array.isArray(content)) {
      for (const c of content) {
        const part = obj(c);
        const type = part?.type;
        if (type && type !== "text" && type !== "output_text") continue;
        if (typeof part?.text === "string") parts.push(part.text);
      }
    }
  }
  return parts.join("\n\n");
}
