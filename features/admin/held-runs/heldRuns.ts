/**
 * Held runs — every run a spend gate refused, kept frozen in `billing.held_run` so a person can open
 * exactly what it was going to do and replay it as themselves (Arman, 2026-10-11: "This only helps
 * me if I can see the exact run that we stopped").
 *
 * The server keeps them (aidream `services/billing/held_runs.py`, at the one paid-call seam every
 * gate shares); the alarm the same refusal raised carries the same `request_id` on its occurrence,
 * which is how an alarm finds its held runs here. A replay runs the same mandate with the frozen
 * inputs through the canonical launch (`launchMandate`), streamed in the chat window, as the person
 * who clicked; `billing.held_run_note_replay` records it on the held run for side-by-side review.
 */

import { pgErrorToError } from "@ai-matrx/data";
import { supabase } from "@/utils/supabase/client";

export const HELD_RUNS_PATH = "/administration/billing/held-runs";

export interface HeldRunReplay {
  conversation_id: string;
  version_mode: ReplayVersionMode;
  agent_id: string | null;
  by: string | null;
  at: string;
}

export interface HeldRun {
  id: string;
  gate: string;
  refusal_message: string | null;
  driver: string | null;
  mandate_key: string | null;
  door: string | null;
  door_args: unknown;
  agent_id: string | null;
  agent_version_id: string | null;
  agent_version_number?: number | null;
  agent_name: string | null;
  is_version: boolean;
  variables: Record<string, unknown>;
  user_input: unknown;
  context_entries: Record<string, unknown> | null;
  model: string | null;
  estimated_cost_usd: number | null;
  tools: string[] | null;
  messages: Array<{ role: string; content: unknown }> | null;
  run_user_id: string | null;
  request_ids: string[];
  conversation_id: string | null;
  refs: Record<string, string>;
  occurrence_count: number;
  last_seen_at: string;
  created_at: string;
  replays: HeldRunReplay[];
}

export type ReplayVersionMode = "current" | "original";

const COLUMNS =
  "id, gate, refusal_message, driver, mandate_key, door, door_args, agent_id, agent_version_id, agent_version_number, agent_name, is_version, variables, user_input, context_entries, model, estimated_cost_usd, tools, messages, run_user_id, request_ids, conversation_id, refs, occurrence_count, last_seen_at, created_at, replays";

function billing() {
  // billing.held_run is read through the platform-admin lane (RLS platform_admin_read).
  return supabase.schema("billing");
}

function fromRow(raw: Record<string, unknown>): HeldRun {
  const row = raw as unknown as HeldRun;
  return {
    ...row,
    variables: (raw.variables as Record<string, unknown>) ?? {},
    request_ids: (raw.request_ids as string[]) ?? [],
    refs: (raw.refs as Record<string, string>) ?? {},
    replays: Array.isArray(raw.replays) ? (raw.replays as HeldRunReplay[]) : [],
    estimated_cost_usd: raw.estimated_cost_usd == null ? null : Number(raw.estimated_cost_usd),
  };
}

export const heldRunHref = (id: string) => `${HELD_RUNS_PATH}/${id}`;
export const mandateAdminHref = (key: string) => `/administration/intelligence/mandates/${encodeURIComponent(key)}`;
export const agentBuildHref = (agentId: string) => `/administration/agents/system-agents/agents/${agentId}/build`;

/** The distinct request ids an alarm's occurrences carry, in order. */
export function requestIdsOf(occurrences: Array<{ refs: { request_id?: string | null } }>): string[] {
  const out: string[] = [];
  for (const o of occurrences) {
    const id = o.refs.request_id;
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export async function fetchHeldRun(id: string): Promise<HeldRun | null> {
  const { data, error } = await billing().from("held_run").select(COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw pgErrorToError(error);
  return data ? fromRow(data as Record<string, unknown>) : null;
}

/** Held runs whose request ids appear on this alarm's occurrences — newest first. */
export async function fetchHeldRunsForAlarm(alarmId: string): Promise<HeldRun[]> {
  const { data: occ, error: occError } = await billing()
    .from("spend_alarm_occurrence")
    .select("refs")
    .eq("alarm_id", alarmId)
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (occError) throw pgErrorToError(occError);
  const ids = requestIdsOf(((occ ?? []) as Array<{ refs: Record<string, string> | null }>).map((o) => ({ refs: o.refs ?? {} })));
  if (ids.length === 0) return [];
  const { data, error } = await billing()
    .from("held_run")
    .select(COLUMNS)
    .overlaps("request_ids", ids)
    .is("deleted_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(50);
  if (error) throw pgErrorToError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(fromRow);
}

export async function noteHeldRunReplay(
  id: string,
  conversationId: string,
  mode: ReplayVersionMode,
  agentId: string | null,
): Promise<HeldRun> {
  const { data, error } = await billing().rpc("held_run_note_replay", {
    p_id: id,
    p_conversation_id: conversationId,
    p_version_mode: mode,
    ...(agentId ? { p_agent_id: agentId } : {}),
  });
  if (error) throw pgErrorToError(error);
  return fromRow(data as Record<string, unknown>);
}

export interface ReplayLaunch {
  door: "mandate" | "agent";
  mandateKey: string | null;
  agentId: string | null;
  /** The agent version the original run resolved to — set only for an "original version" replay. */
  versionId: string | null;
  variables: Record<string, unknown>;
  userInput: string | undefined;
}

/** What one replay launches: the same mandate (current binding) with the frozen inputs. */
export function replayLaunch(run: HeldRun, mode: ReplayVersionMode): ReplayLaunch {
  const userInput = typeof run.user_input === "string" && run.user_input.trim() ? run.user_input : undefined;
  if (mode === "original" || !run.mandate_key) {
    return {
      door: "agent",
      mandateKey: null,
      agentId: run.agent_id,
      versionId: mode === "original" ? run.agent_version_id : null,
      variables: run.variables,
      userInput,
    };
  }
  return { door: "mandate", mandateKey: run.mandate_key, agentId: null, versionId: null, variables: run.variables, userInput };
}

/** The price line shown before the click — to the cent, never rounded to zero. */
export function replayCostLine(estimated: number | null): string {
  if (estimated == null) return "Cost not priced";
  if (estimated < 0.01) return "About <$0.01 per replay";
  return `About $${estimated.toFixed(2)} per replay`;
}

export function variableRows(variables: Record<string, unknown>): Array<{ name: string; value: string }> {
  return Object.entries(variables).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? value : JSON.stringify(value, null, 2),
  }));
}

/** Alarm kinds raised by a gate refusal — each one's runs are kept as held runs. */
export const HELD_RUN_ALARM_KINDS: ReadonlySet<string> = new Set([
  "protected_account_refusal",
  "spend_approval_hold",
  "readiness_not_ready",
  "top_tier_model_refused",
  "automation_guardrail",
]);

export const GATE_LABEL: Record<string, string> = {
  protected_account_run_refused: "Protected account",
  run_approval_required: "Spend approval",
  usage_limit_reached: "Usage limit",
  readiness_refused: "Not ready",
  top_tier_model_refused: "Top-tier model",
  automation_guardrail: "Automation limit",
};

export function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block && typeof block === "object" && "text" in block && typeof (block as { text: unknown }).text === "string") {
          return (block as { text: string }).text;
        }
        return JSON.stringify(block, null, 2);
      })
      .join("\n\n");
  }
  return JSON.stringify(content, null, 2);
}
