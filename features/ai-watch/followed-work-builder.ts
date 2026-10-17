/**
 * Builder entries for followed server work and for the tab's live AI runs — pure mappers, so the
 * one publisher (`FollowedWorkSync`) stays thin and the shape is testable.
 */

import type { BuilderPublishInput } from "@/features/builder-panel/types";
import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { FollowedWork } from "./followed-work";
import type { Resolved } from "./followed-work-resolve";

export const SERVER_WORK_SURFACE = "ai.server_work";
export const PAGE_RUNS_SURFACE = "ai.page_runs";
export const SERVER_WORK_PREFIX = "work.";
export const PAGE_RUN_PREFIX = "run.";

/** Inputs, progress and every step (answer + the AI call it opens) of each followed work item. */
export function serverWorkEntries(work: readonly FollowedWork[], resolved: Readonly<Record<string, Resolved>>): BuilderPublishInput[] {
  const out: BuilderPublishInput[] = [];
  for (const w of work) {
    const r = resolved[w.key];
    const head = `${SERVER_WORK_PREFIX}${w.key}`;
    out.push({
      key: `${head}.progress`,
      label: `${w.label} · progress`,
      group: "workflow",
      source: w.source,
      data: r
        ? { status: r.status, done: r.done, error: r.error, state: r.state, read_at: new Date(r.readAt).toISOString() }
        : { status: "reading", done: false },
    });
    if (!r) continue;
    if (r.inputs !== null && r.inputs !== undefined) {
      out.push({ key: `${head}.inputs`, label: `${w.label} · started with`, group: "inputs", source: w.source, data: r.inputs });
    }
    for (const s of r.steps) {
      out.push({
        key: `${head}.step.${s.id}`,
        label: `${w.label} · ${s.label}`,
        group: "ai",
        source: s.mandateKey ?? w.source,
        data: { status: s.status, mandate_key: s.mandateKey, record: s.record },
        ref: s.userRequestId || s.conversationId ? { type: "ai_run", userRequestId: s.userRequestId, conversationId: s.conversationId } : null,
      });
    }
  }
  return out;
}

/** Every AI run this tab holds (a launched agent, a streamed turn): one AI-calls entry each. */
export function pageRunEntries(runs: readonly WatchableRun[]): BuilderPublishInput[] {
  return runs.map((run) => ({
    key: `${PAGE_RUN_PREFIX}${run.key}`,
    label: run.mandateRun?.mandate_key ?? "AI run",
    group: "ai" as const,
    source: run.live ? "live" : "finished",
    data: {
      server_request_id: run.serverRequestId,
      request_ids: run.requestIds,
      conversation_id: run.conversationId,
      mandate_key: run.mandateRun?.mandate_key ?? null,
      live: run.live,
      started_at: run.startedAt,
    },
    ref: { type: "ai_run" as const, requestId: run.requestIds.at(-1) ?? null, userRequestId: run.serverRequestId, conversationId: run.conversationId },
  }));
}
