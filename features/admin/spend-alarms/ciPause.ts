/**
 * The CI spend alarm's real buttons: pause / resume the costly GitHub workflows through the
 * aidream server (`/ci-spend/costly`, `/ci-spend/pause`, `/ci-spend/resume`, super admin).
 * The server refuses the production release path and records what it paused on the alarm
 * (`billing.spend_alarm.metadata.ci_pause`, read back through `spend_alarm_rows`).
 */

import { buildMatrxRequestUrl, sendMatrxRequest } from "@ai-matrx/agents/matrx";
import { resolveServiceBaseUrl } from "@/lib/api/resolve-service-url";
import { serverMessageFromBody, WriteRefusedError } from "@/lib/errors/writeFailure";
import { supabase } from "@/utils/supabase/client";

export interface CostlyWorkflow {
  repo: string;
  workflow: string;
  usd_per_day: number;
  pausable: boolean;
  reason: string | null;
}

export interface PausedWorkflow {
  repo: string;
  workflow: string;
  file: string;
  usd_per_day: number | null;
  paused_at: string;
}

export interface CiPauseRecord {
  paused: PausedWorkflow[];
}

export interface PauseResult {
  paused: PausedWorkflow[];
  refused: { repo: string; workflow: string; reason: string }[];
  skipped: { repo: string; workflow: string; reason: string }[];
  failed: { repo: string; workflow: string; reason: string }[];
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in: cannot reach the server.");
  const res = await sendMatrxRequest(buildMatrxRequestUrl(resolveServiceBaseUrl("aidream"), path), {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      // not JSON
    }
    throw new WriteRefusedError({
      status: res.status,
      serverMessage: serverMessageFromBody(parsed),
      technical: `${method} ${path} ${res.status}`,
    });
  }
  return (await res.json()) as T;
}

export async function fetchCostlyWorkflows(alarmId: string): Promise<CostlyWorkflow[]> {
  const out = await call<{ workflows: CostlyWorkflow[] }>("GET", `/ci-spend/costly?alarm_id=${encodeURIComponent(alarmId)}`);
  return out.workflows;
}

export async function pauseCostlyWorkflows(alarmId: string): Promise<PauseResult> {
  const out = await call<PauseResult>("POST", "/ci-spend/pause", { alarm_id: alarmId });
  // A pause that paused nothing is not a success: the person is told why.
  if (out.paused.length === 0) {
    const why = [...out.refused, ...out.failed, ...out.skipped].map((r) => `${r.workflow}: ${r.reason}`).join("; ");
    throw new Error(`Nothing was paused. ${why}`.trim());
  }
  return out;
}

export async function resumeCostlyWorkflows(alarmId: string): Promise<void> {
  const out = await call<{ resumed: unknown[]; failed: { workflow: string; reason: string }[] }>("POST", "/ci-spend/resume", { alarm_id: alarmId });
  if (out.failed.length > 0) throw new Error(`Not resumed: ${out.failed.map((f) => `${f.workflow}: ${f.reason}`).join("; ")}`);
}

/** `metadata.ci_pause` of an alarm row, or null when nothing is paused. */
export function ciPauseOf(meta: unknown): CiPauseRecord | null {
  const raw = (meta as { ci_pause?: { paused?: unknown } } | null | undefined)?.ci_pause;
  const paused = Array.isArray(raw?.paused) ? (raw.paused as PausedWorkflow[]) : [];
  return paused.length > 0 ? { paused } : null;
}
