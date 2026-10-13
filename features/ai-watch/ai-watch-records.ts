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

import { readAllRows } from "@ai-matrx/data/db";
import type { MandateRunData } from "@ai-matrx/agents/generated/stream-events";
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
  /** THE run's mandate frame as stored on its own row (`metadata.mandate_watch`). */
  mandateWatch: MandateRunData | null;
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
    mandateWatch: (obj(metadata.mandate_watch) as MandateRunData | null) ?? null,
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
  if (!scope.workflowRunId && !scope.conversationId) return [];
  // The whole flow, never the first page: a long workflow has more steps than one read returns.
  const rows = await readAllRows(
    ({ from, to }) => {
      let query = supabase
        .schema("chat")
        .from("user_request")
        .select("id, status, source_feature, created_at, metadata")
        .is("deleted_at", null);
      query = scope.workflowRunId
        ? query.eq("workflow_run_id", scope.workflowRunId)
        : query.eq("conversation_id", scope.conversationId as string);
      return query
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
    },
    { label: "chat.user_request (Watch AI runs)" },
  );
  return (rows as Row[]).map((row, index) => {
    const metadata = obj(row.metadata) ?? {};
    const holder = obj(metadata.mandate_holder);
    const watch = obj(metadata.mandate_watch);
    return {
      userRequestId: String(row.id),
      label:
        str(holder?.name) ??
        // Only a turn that passed a mandate door is labelled with its mandate.
        str(watch?.mandate_key) ??
        str(row.source_feature) ??
        `Run ${index + 1}`,
      status: str(row.status),
      createdAt: String(row.created_at ?? ""),
    };
  });
}

export interface SplitProviderRequest {
  /** Which request family was recognised; null means show the raw JSON. */
  shape: "anthropic" | "gemini" | "openai-responses" | "chat-completions" | null;
  system: unknown;
  messages: unknown[];
  tools: unknown[];
  settings: Record<string, unknown>;
  raw: Record<string, unknown> | null;
}

const dropNulls = (o: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));

/** Gemini tools: function declarations flattened, plus any built-in tool switched on. */
function geminiTools(tools: unknown): unknown[] {
  if (!Array.isArray(tools)) return [];
  const out: unknown[] = [];
  for (const t of tools) {
    const tool = obj(t);
    if (!tool) continue;
    const decls = tool.function_declarations ?? tool.functionDeclarations;
    if (Array.isArray(decls)) out.push(...decls);
    for (const [k, v] of Object.entries(tool)) {
      if (k === "function_declarations" || k === "functionDeclarations") continue;
      if (v !== null && v !== undefined) out.push({ [k]: v });
    }
  }
  return out;
}

const isSystemRole = (m: unknown) => {
  const role = obj(m)?.role;
  return role === "system" || role === "developer";
};

/**
 * The parts of a provider request a person reads first, for every request
 * family we send: Anthropic Messages, Gemini (SDK `config` and REST
 * `systemInstruction`/`generationConfig`), OpenAI Responses, and Chat
 * Completions (OpenAI chat, Groq, Cerebras, xAI chat, …). A shape we do not
 * recognise is never shown as "(none)": `shape` is null and the window shows
 * the raw JSON.
 */
export function splitProviderRequest(body: Record<string, unknown> | null): SplitProviderRequest {
  const empty = { system: null, messages: [], tools: [], settings: {} };
  if (!body) return { shape: null, ...empty, raw: null };

  // Gemini — SDK form {model, contents, config:{system_instruction, tools, …}}
  // or REST form {contents, systemInstruction, tools, generationConfig}.
  if (Array.isArray(body.contents)) {
    const { contents, config, systemInstruction, system_instruction, tools, ...rest } = body;
    const cfg = obj(config) ?? {};
    const { system_instruction: cfgSystem, systemInstruction: cfgSystem2, tools: cfgTools, ...cfgRest } = cfg;
    return {
      shape: "gemini",
      system: systemInstruction ?? system_instruction ?? cfgSystem ?? cfgSystem2 ?? null,
      messages: contents as unknown[],
      tools: geminiTools(tools ?? cfgTools),
      settings: dropNulls({ ...rest, ...cfgRest }),
      raw: body,
    };
  }

  // OpenAI Responses — {input, instructions?, tools}; system rides as
  // `instructions` or as developer/system items in `input`.
  if (Array.isArray(body.input) || typeof body.input === "string") {
    const { input, instructions, tools, ...rest } = body;
    const items = Array.isArray(input) ? input : [{ role: "user", content: input }];
    const systemItems = items.filter(isSystemRole);
    return {
      shape: "openai-responses",
      system: instructions ?? (systemItems.length ? systemItems : null),
      messages: items.filter((m) => !isSystemRole(m)),
      tools: Array.isArray(tools) ? tools : [],
      settings: dropNulls(rest),
      raw: body,
    };
  }

  if (Array.isArray(body.messages)) {
    const { messages, system, tools, ...rest } = body;
    // Anthropic Messages — top-level `system`.
    const anthropicTools = Array.isArray(tools) && tools.some((t) => obj(t)?.input_schema !== undefined);
    if (system !== undefined || anthropicTools) {
      return {
        shape: "anthropic",
        system: system ?? null,
        messages,
        tools: Array.isArray(tools) ? tools : [],
        settings: dropNulls(rest),
        raw: body,
      };
    }
    // Chat Completions — system/developer messages inside `messages`.
    const systemMessages = messages.filter(isSystemRole);
    return {
      shape: "chat-completions",
      system: systemMessages.length ? systemMessages.map((m) => obj(m)?.content) : null,
      messages: messages.filter((m) => !isSystemRole(m)),
      tools: Array.isArray(tools) ? tools : [],
      settings: dropNulls(rest),
      raw: body,
    };
  }

  return { shape: null, ...empty, raw: body };
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

/** The agent VERSION a run used (by version id): its instructions and output schema. */
export interface AiWatchAgentVersion {
  id: string;
  agentId: string | null;
  versionNumber: number | null;
  name: string | null;
  messages: unknown;
  outputSchema: unknown;
}

export async function fetchAgentVersion(versionId: string): Promise<AiWatchAgentVersion | null> {
  const { data, error } = await supabase
    .schema("agent")
    .from("definition_version")
    .select("id, agent_id, version_number, name, messages, output_schema")
    .eq("id", versionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Row;
  return {
    id: String(row.id),
    agentId: str(row.agent_id),
    versionNumber: num(row.version_number),
    name: str(row.name),
    messages: row.messages ?? null,
    outputSchema: row.output_schema ?? null,
  };
}

/** The mandate definition's CURRENT version — compared against the version the run used. */
export async function fetchMandateDefinitionVersion(mandateId: string): Promise<number | null> {
  const { data, error } = await supabase
    .schema("mandate")
    .from("definition")
    .select("version")
    .eq("id", mandateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? num((data as Row).version) : null;
}
