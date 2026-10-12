/**
 * Data to model — the model door.
 *
 * Both modes go through aidream `POST /ai/manual`, the door the Agent Builder's Test run and Model
 * view use for an unsaved definition: no saved agent, no system prompt — only the person's
 * question (plus, for HANDED OVER, the data block) as the user message, and for MODEL FETCHES the
 * registered `site_data` tool. `dry_run: true` returns the exact provider request without sending
 * it (aidream `api/utils/preview.py::build_preview`); a run streams NDJSON and is never stored
 * (`store: false`).
 */

import { parseMatrxNdjsonResponse } from "@ai-matrx/agents/matrx";

import { requestRaw } from "@/lib/python-client";

export type LabMode = "handed" | "tools";

export interface LabRequest {
  mode: LabMode;
  modelId: string;
  organizationId: string;
  /** The whole user message. */
  text: string;
  /** Model turns allowed (tools mode needs a turn per tool round). */
  maxIterations: number;
}

function body(req: LabRequest, dryRun: boolean): Record<string, unknown> {
  return {
    ai_model_id: req.modelId,
    messages: [{ role: "user", content: [{ type: "text", text: req.text }] }],
    stream: true,
    store: false,
    debug: false,
    max_iterations: req.maxIterations,
    max_retries_per_iteration: 1,
    conversation_id: crypto.randomUUID(),
    is_new: true,
    organization_id: req.organizationId,
    tools_replace: req.mode === "tools" ? [{ kind: "registered", name: "site_data" }] : [],
    ...(dryRun ? { dry_run: true } : {}),
  };
}

async function errorText(response: Response): Promise<string> {
  try {
    const j = (await response.json()) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (j.detail && typeof j.detail === "object") {
      const d = j.detail as Record<string, unknown>;
      return String(d.user_message ?? d.message ?? JSON.stringify(d));
    }
  } catch {
    // not JSON
  }
  return `The server answered ${response.status}.`;
}

export interface CapturedRequest {
  provider: string | null;
  model: string | null;
  /** The provider request exactly as it would be sent. */
  request: Record<string, unknown>;
}

/** The exact provider request for this mode, never sent. */
export async function dryRun(req: LabRequest, signal?: AbortSignal): Promise<CapturedRequest> {
  const response = await requestRaw(
    "/ai/manual",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(req, true)) },
    { organizationId: req.organizationId, signal, allowHttpError: true },
  );
  if (!response.ok) throw new Error(await errorText(response));
  const j = (await response.json()) as Record<string, unknown>;
  const request = (j.request && typeof j.request === "object" ? j.request : {}) as Record<string, unknown>;
  return { provider: typeof j.provider === "string" ? j.provider : null, model: typeof j.model === "string" ? j.model : null, request };
}

/** The tool definitions inside a captured provider request, whatever the provider's wire shape. */
export function toolsOf(request: Record<string, unknown>): Record<string, unknown>[] {
  const direct = request.tools;
  if (Array.isArray(direct)) return direct as Record<string, unknown>[];
  const body = request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : null;
  if (body && Array.isArray(body.tools)) return body.tools as Record<string, unknown>[];
  return [];
}

export interface CaptureParts {
  systemChars: number;
  userChars: number;
  toolChars: number;
}

/** How big each part of a captured request is: the platform's system turn, the user message, the tools. */
export function captureParts(request: Record<string, unknown>): CaptureParts {
  const body = request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : request;
  const msgs = (Array.isArray(body.messages) ? body.messages : Array.isArray(body.input) ? body.input : []) as { role?: string; content?: unknown }[];
  const size = (role: (r: string) => boolean) => msgs.filter((m) => role(String(m.role ?? ""))).reduce((n, m) => n + (typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "")).length, 0);
  const sys = typeof body.system === "string" ? body.system.length : body.system ? JSON.stringify(body.system).length : 0;
  return {
    systemChars: sys + size((r) => r === "system" || r === "developer"),
    userChars: size((r) => r === "user"),
    toolChars: toolsOf(request).length ? JSON.stringify(toolsOf(request)).length : 0,
  };
}

/** Records the provider billed across the run's tool results (each result's `provenance.records_billed`). */
export function recordsBilled(calls: LabToolCall[]): number {
  let n = 0;
  for (const c of calls) {
    if (!c.result) continue;
    try {
      const j = JSON.parse(c.result) as { provenance?: { records_billed?: unknown }; record_count?: unknown };
      n += Number(j.provenance?.records_billed ?? j.record_count ?? 0) || 0;
    } catch {
      // a non-JSON result billed nothing we can read
    }
  }
  return n;
}

export interface LabToolCall {
  callId: string;
  name: string;
  args: Record<string, unknown> | null;
  /** What the tool handed back to the model (text or JSON), when the stream carried it. */
  result: string | null;
  status: "running" | "done" | "error";
  message: string | null;
}

export interface LabRunResult {
  answer: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
  latencyMs: number;
  toolCalls: LabToolCall[];
  error: string | null;
  /** Every event, for the raw view. */
  events: unknown[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

function findNumber(o: unknown, keys: string[], depth = 0): number | null {
  if (!o || typeof o !== "object" || depth > 4) return null;
  const r = o as Record<string, unknown>;
  for (const k of keys) {
    const n = num(r[k]);
    if (n != null) return n;
  }
  for (const v of Object.values(r)) {
    if (v && typeof v === "object") {
      const n = findNumber(v, keys, depth + 1);
      if (n != null) return n;
    }
  }
  return null;
}

function asText(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : JSON.stringify(v);
}

/** Runs one mode for real; `onUpdate` sees the answer and tool calls as they stream. */
export async function runLab(req: LabRequest, onUpdate: (r: LabRunResult) => void, signal?: AbortSignal): Promise<LabRunResult> {
  const started = performance.now();
  const out: LabRunResult = { answer: "", tokensIn: null, tokensOut: null, costUsd: null, latencyMs: 0, toolCalls: [], error: null, events: [] };
  const response = await requestRaw(
    "/ai/manual",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(req, false)) },
    { organizationId: req.organizationId, signal, allowHttpError: true },
  );
  if (!response.ok) {
    out.error = await errorText(response);
    out.latencyMs = performance.now() - started;
    return out;
  }
  const calls = new Map<string, LabToolCall>();
  let llmIn = 0;
  let llmOut = 0;
  let llmCost = 0;
  let sawLlm = false;
  for await (const evt of parseMatrxNdjsonResponse(response, signal).events) {
    out.events.push(evt);
    const e = evt as { event?: string; data?: Record<string, unknown> };
    const d = e.data ?? {};
    if (e.event === "chunk") {
      out.answer += typeof d.text === "string" ? d.text : typeof d.content === "string" ? d.content : "";
    } else if (e.event === "tool_event") {
      const id = String(d.call_id ?? "");
      const call = calls.get(id) ?? { callId: id, name: String(d.tool_name ?? ""), args: null, result: null, status: "running" as const, message: null };
      const data = (d.data && typeof d.data === "object" ? d.data : {}) as Record<string, unknown>;
      const args = data.arguments ?? data.args ?? data.input;
      if (args && typeof args === "object") call.args = args as Record<string, unknown>;
      if (typeof d.message === "string") call.message = d.message;
      if (d.event === "tool_completed") {
        call.status = "done";
        call.result = asText(data.result ?? data.output ?? data.content) ?? call.result;
      } else if (d.event === "tool_error") {
        call.status = "error";
        call.result = asText(data.error ?? d.message);
      }
      calls.set(id, call);
    } else if (e.event === "completion") {
      const result = d.result ?? {};
      if (d.operation === "llm_request") {
        sawLlm = true;
        llmIn += findNumber(result, ["input_tokens", "prompt_tokens"]) ?? 0;
        llmOut += findNumber(result, ["output_tokens", "completion_tokens"]) ?? 0;
        llmCost += findNumber(result, ["total_cost", "cost_usd", "cost"]) ?? 0;
      } else if (d.operation === "user_request") {
        out.tokensIn = findNumber(result, ["input_tokens", "total_input_tokens", "prompt_tokens"]);
        out.tokensOut = findNumber(result, ["output_tokens", "total_output_tokens", "completion_tokens"]);
        out.costUsd = findNumber(result, ["total_cost", "cost_usd", "cost"]);
        if (!out.answer) {
          const text = (result as Record<string, unknown>).output ?? (result as Record<string, unknown>).text;
          if (typeof text === "string") out.answer = text;
        }
      }
    } else if (e.event === "error") {
      out.error = String(d.user_message ?? d.message ?? "The run failed.");
    }
    out.toolCalls = [...calls.values()];
    onUpdate({ ...out, latencyMs: performance.now() - started });
  }
  if (sawLlm) {
    out.tokensIn ??= llmIn;
    out.tokensOut ??= llmOut;
    out.costUsd ??= llmCost || null;
  }
  out.latencyMs = performance.now() - started;
  return out;
}
