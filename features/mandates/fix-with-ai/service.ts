// features/mandates/fix-with-ai/service.ts
//
// FIX WITH AI — fix the AGENT that answers a job in the wrong shape (Arman, 2026-10-18).
// Two aidream doors (`aidream/services/mandates/fix_with_ai.py`):
//   POST /mandates/fix-with-ai/draft    the Agent Factory drafts a new version of the Holder
//                                       agent, re-runs the failed input on it (never live)
//   POST /mandates/fix-with-ai/approve  the approved draft becomes the agent's new version
// Not in the generated api-types yet, so the path is cast here (as features/mandates/runs does).

import { callApi, type ApiCallConfig } from "@/lib/api/call-api";
import type { AppDispatch } from "@/lib/redux/store";
import type { JsonObject } from "@/types/json";
import { fetchRuns } from "@/features/mandates/run-history/service";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

export interface FixRerun {
  conversation_id: string | null;
  success: boolean;
  output: string;
  error: string | null;
  missing_keys: string[];
  kind: string | null;
  fits: boolean;
}

export interface FixDraft {
  mandate_key: string;
  agent_id: string | null;
  agent_name: string | null;
  can_apply: boolean;
  refusal: string | null;
  draft_agent_id: string | null;
  expected_kind: string | null;
  required_keys: string[];
  problems_before: string[];
  problems_after: string[];
  schema_before: JsonObject | null;
  schema_after: JsonObject | null;
  system_before: string;
  system_after: string;
  user_before: string;
  user_after: string;
  failed_output: string | null;
  failed_conversation_id: string | null;
  rerun: FixRerun | null;
  notes: string[];
}

export interface FixApproved {
  agent_id: string;
  version_id: string | null;
  version_number: number | null;
}

/** The draft runs a factory step and a re-run: tens of seconds, under Cloudflare's 100 s. */
const FIX_WAIT_MS = 95_000;

async function post<T>(dispatch: AppDispatch, path: string, body: JsonObject): Promise<T> {
  const config = {
    path,
    method: "POST",
    body,
    connectTimeoutMs: FIX_WAIT_MS,
    totalTimeoutMs: FIX_WAIT_MS,
    expectedErrorStatuses: [400, 401, 403, 404, 409, 422],
  } as unknown as ApiCallConfig<"/ai/mandates/{mandate_key}", "POST">;
  const res = await dispatch(callApi(config));
  if (res.error) throw new Error(res.error.message || "Fix with AI did not answer.");
  return res.data as unknown as T;
}

export function draftFix(
  dispatch: AppDispatch,
  input: { mandateKey: string; agentId: string | null; conversationId: string | null },
): Promise<FixDraft> {
  return post<FixDraft>(dispatch, "/mandates/fix-with-ai/draft", {
    mandate_key: input.mandateKey,
    ...(input.agentId ? { agent_id: input.agentId } : {}),
    ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
  });
}

export function approveFix(
  dispatch: AppDispatch,
  input: { agentId: string; draftAgentId: string },
): Promise<FixApproved> {
  return post<FixApproved>(dispatch, "/mandates/fix-with-ai/approve", {
    agent_id: input.agentId,
    draft_agent_id: input.draftAgentId,
  });
}

/** The viewer's newest run of this job on this agent — the failed input the draft re-runs. */
export async function latestRunOf(mandateKey: string, agentId: string | null): Promise<string | null> {
  const page = await fetchRuns({
    scope: { mandateKey: mandateKey as AnyMandateKey },
    view: "mine",
    limit: 25,
  });
  const runs = page.rows.filter((r) => r.runKind === "conversation" && (!agentId || r.holderId === agentId));
  const warned = runs.find((r) => r.outputWarned || r.outputMissingKeys.length > 0 || r.status === "failed");
  return (warned ?? runs[0])?.runId ?? null;
}
