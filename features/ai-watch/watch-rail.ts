/**
 * The Watch AI window's left list — pure, tested (`__tests__/watch-rail.test.ts`).
 *
 * ONE window per page (2026-10-14): every AI call of the page's runs, grouped by run (newest run
 * first, calls in the order they started), the tab's live calls merged onto their recorded rows.
 * The selection follows the newest live call until the person picks one; a new run clears the pick.
 */

import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { AiWatchRunSummary } from "./ai-watch-records";

export interface RailCall {
  /** The server run id once known; the client request id until then. */
  key: string;
  serverId: string | null;
  label: string;
  status: string | null;
  live: boolean;
  startedAt: string;
  nodeId: string | null;
}

export interface RailGroup {
  /** The workflow run id, `"live"` for calls with no record yet, or `origin:<class>` outside a run. */
  id: string;
  workflowRunId: string | null;
  /** Who started the calls of a group outside a workflow run (`chat.user_request.origin_class`). */
  originClass: string | null;
  startedAt: string;
  calls: RailCall[];
}

/** The tab's own runs, with no record row yet, belong to this group until the record catches up. */
export const UNRECORDED_GROUP = "live";

export function buildRail(registry: readonly WatchableRun[], records: readonly AiWatchRunSummary[]): RailGroup[] {
  const liveByServer = new Map<string, WatchableRun>();
  for (const run of registry) if (run.serverRequestId) liveByServer.set(run.serverRequestId, run);

  const groups = new Map<string, RailGroup>();
  const seen = new Set<string>();
  for (const r of records) {
    // Outside a workflow run a call is grouped by WHO STARTED IT — never one blanket "chat"
    // group (2026-10-16: factory, API and scheduled calls all read "Chat").
    const gid = r.workflowRunId ?? `origin:${r.originClass ?? "unknown"}`;
    let group = groups.get(gid);
    if (!group) {
      group = {
        id: gid,
        workflowRunId: r.workflowRunId,
        originClass: r.workflowRunId ? null : r.originClass,
        startedAt: r.createdAt,
        calls: [],
      };
      groups.set(gid, group);
    }
    if (r.createdAt && (!group.startedAt || r.createdAt < group.startedAt)) group.startedAt = r.createdAt;
    const live = liveByServer.get(r.userRequestId);
    seen.add(r.userRequestId);
    group.calls.push({
      key: r.userRequestId,
      serverId: r.userRequestId,
      label: r.label,
      status: live?.live ? "live" : r.status,
      live: Boolean(live?.live),
      startedAt: r.createdAt,
      nodeId: r.nodeId,
    });
  }

  // Live calls the record has not listed yet (it is re-read every few seconds).
  const unrecorded: RailCall[] = registry
    .filter((run) => !(run.serverRequestId && seen.has(run.serverRequestId)))
    .map((run) => ({
      key: run.key,
      serverId: run.serverRequestId,
      label: run.mandateRun?.mandate_key ?? "AI run",
      status: run.live ? "live" : null,
      live: run.live,
      startedAt: run.startedAt,
      nodeId: null,
    }));

  for (const group of groups.values()) group.calls.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const ordered = [...groups.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (unrecorded.length) {
    unrecorded.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    ordered.unshift({
      id: UNRECORDED_GROUP,
      workflowRunId: null,
      originClass: null,
      startedAt: unrecorded.at(-1)?.startedAt ?? "",
      calls: unrecorded,
    });
  }
  return ordered;
}

/**
 * The call the window shows when nobody picked one: the newest live call, else the newest call of
 * the page's current run. A run that has made no AI call yet selects NOTHING — never an older
 * run's finished call (2026-10-14: the window showed the last round's classifier on a new round).
 */
export function autoSelection(groups: readonly RailGroup[], currentRunId: string | null = null): string | null {
  const all = groups.flatMap((g) => g.calls);
  const live = all.filter((c) => c.live).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (live[0]) return live[0].key;
  if (currentRunId) return groups.find((g) => g.workflowRunId === currentRunId)?.calls.at(-1)?.key ?? null;
  return groups[0]?.calls.at(-1)?.key ?? null;
}

/** Resolve a door's target (a client request, a server run, or a run's step) to a rail key. */
export function focusKey(
  groups: readonly RailGroup[],
  registry: readonly WatchableRun[],
  focus: { requestId: string | null; userRequestId: string | null; nodeId: string | null; workflowRunId: string | null },
): string | null {
  if (focus.userRequestId) return focus.userRequestId;
  if (focus.requestId) {
    const run = registry.find((r) => r.requestIds.includes(focus.requestId as string));
    if (run) return run.key;
  }
  if (focus.nodeId) {
    const group = groups.find((g) => g.workflowRunId === focus.workflowRunId) ?? null;
    const calls = (group ? group.calls : groups.flatMap((g) => g.calls)).filter((c) => c.nodeId === focus.nodeId);
    if (calls.length) return calls.at(-1)?.key ?? null;
  }
  return null;
}

const ORIGIN_HEADINGS: Record<string, string> = {
  human: "Chat",
  delegated_member: "Chat",
  client_auto: "App calls",
  api: "API calls",
  child_agent: "Subagent calls",
  workflow: "Workflow calls",
  scheduled: "Scheduled calls",
  system: "System calls",
};

/** A rail group's heading: the page's run, an earlier run, or who started the calls. */
export function railGroupHeading(group: RailGroup, currentRunId: string | null): string {
  if (group.id === UNRECORDED_GROUP) return "Live";
  if (group.workflowRunId) return group.workflowRunId === currentRunId ? "This run" : "Earlier run";
  return ORIGIN_HEADINGS[group.originClass ?? ""] ?? "Other calls";
}

const CALL_TITLES: Record<string, string> = {
  human: "Chat",
  delegated_member: "Chat",
  client_auto: "App call",
  api: "API call",
  child_agent: "Subagent call",
  workflow: "Workflow step",
  scheduled: "Scheduled call",
  system: "System call",
};

/** The selected call's transcript title: who started it. Only a person's own call is a "Chat". */
export function callKindTitle(originClass: string | null, workflowRunId: string | null): string {
  if (workflowRunId) return "Workflow step";
  return CALL_TITLES[originClass ?? ""] ?? "Call";
}
