"use client";

/**
 * AiWatchWindow — Watch AI: ONE AI run, exactly as it ran (Arman, 2026-10-13).
 *
 * "I see the window panel ... the exact mandate ... the exact provision and the values
 * that are currently filling the individual provision values ... the exact goal and the
 * exact output structure ... the data that comes in ... in real time ... It cannot be
 * guessing at the data and it cannot be creating a separate instance of it."
 *
 * WHO: system admins with debug mode on (`useCanWatchAi`, registered admin feature
 * `ai.watch`). Anyone else gets an honest refusal, never a run.
 *
 * IDENTITY: a run is its SERVER id (`chat.user_request.id`). The window binds to that id
 * and to every client request carrying it (a resume adds one) — never a conversation's
 * newest turn, never a time window. Truth rules: `features/ai-watch/watch-run-truth.ts`.
 *
 * SOURCES, in order:
 *  - live: `state.activeRequests` — the response through the ONE pipeline
 *    (`LiveRunDisplay` → kind registry), the exact provider request as the
 *    `context_analysis` wire capture filtered to this run's request id, and the
 *    run's own `mandate_run` frame (mandate, holder version, goal, kinds, provision
 *    values as filled at the door);
 *  - recorded: the run's own `chat.user_request` row (incl. `metadata.mandate_watch`,
 *    the same frame) + `chat.request_snapshot`, shown only where no live capture
 *    exists and always labelled a recorded copy.
 *
 * Open it with ONE call: `useWatchAiRun()(…)` (features/overlays/openers/aiWatchWindow.tsx).
 */

import { useEffect, useState } from "react";
import { RunTestReplaysStrip } from "@/features/ai-test-mode/RunTestReplaysStrip";
import Link from "next/link";
import { Eye, Send, Wrench } from "lucide-react";
import { formatCost } from "@ai-matrx/kit/format";
import { LiveRunDisplay } from "@ai-matrx/chat/agents/components/live-run/LiveRunDisplay";
import { useRetainRequestForViewer } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/useRetainRequestForViewer";
import MarkdownStream from "@ai-matrx/chat/ui/markdown-stream/MarkdownStream";
import { selectPageAiRuns, selectPageWorkflowRunIds } from "@/features/ai-watch/page-ai-runs";
import {
  fmtMs,
  fmtTokens,
  getUserRequestResult,
  requestTtftMs,
} from "@ai-matrx/chat/agents/components/run-controls/panels/shared";
import type { ActiveRequest } from "@ai-matrx/chat/agents/types/request.types";
import type { MandateRunData } from "@ai-matrx/agents/generated/stream-events";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { cn, ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { AI_WATCH_PAGE_INSTANCE, watchAiRunAction } from "@/features/overlays/openers/aiWatchWindow";
import { autoSelection, buildRail, focusKey, UNRECORDED_GROUP } from "@/features/ai-watch/watch-rail";
import { currentPointsRate } from "@/components/cost/pointsRate";
import { useCanWatchAi } from "@/features/ai-watch/useCanWatchAi";
import { useOpenMandateWindow } from "@/features/overlays/openers/mandateWindow";
import { useOpenFeedbackWindow } from "@/features/overlays/openers/feedbackDialog";
import {
  chatTurns,
  fetchAgentVersion,
  fetchAiWatchRecord,
  fetchAiWatchRuns,
  fetchMandateDefinitionVersion,
  responseText,
  splitProviderRequest,
  type AiWatchAgentVersion,
  type AiWatchRecord,
  type AiWatchRunSummary,
} from "@/features/ai-watch/ai-watch-records";
import {
  chooseRequestSource,
  continuationView,
  earlierFrames,
  mandateIdentity,
  runCaptures,
  type WatchCall,
} from "@/features/ai-watch/watch-run-truth";

export interface AiWatchWindowProps {
  windowInstanceId: string;
  onClose: () => void;
  /** Live client request id (`activeRequests` key). */
  requestId?: string | null;
  /** Server run id (`chat.user_request.id`) — what survives a refresh. */
  userRequestId?: string | null;
  /** List every AI step of a workflow run. */
  workflowRunId?: string | null;
  /** List every AI turn of a conversation. */
  conversationId?: string | null;
  /** Select this workflow step's call (from the Workflow run rail). */
  nodeId?: string | null;
  label?: string | null;
  /** When the last door pressed set the selection (`watchAiRunAction`). */
  focusAt?: number | null;
}

type ActiveRoot = { activeRequests: { byRequestId: Record<string, ActiveRequest> } };

/** The page's run ids Watch AI remembers across a reload (this tab, this page). */
const HISTORY_KEY_PREFIX = "matrx:ai-watch:runs:";
const HISTORY_MAX = 10;

function readHistory(key: string): string[] {
  try {
    const raw = typeof window === "undefined" ? null : window.sessionStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function runTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AiWatchWindow({
  windowInstanceId,
  onClose,
  requestId = null,
  userRequestId = null,
  workflowRunId = null,
  conversationId = null,
  nodeId = null,
  focusAt = null,
}: AiWatchWindowProps) {
  const canWatch = useCanWatchAi();
  const dispatch = useAppDispatch();

  // ONE window per page: a window restored under an older per-call id folds into it.
  const legacy = windowInstanceId !== AI_WATCH_PAGE_INSTANCE;
  useEffect(() => {
    if (!legacy) return;
    dispatch(watchAiRunAction({ requestId, userRequestId, workflowRunId, conversationId, nodeId }));
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, [legacy]);

  // The page's workflow runs, remembered for this page so a reload keeps the history.
  const pathname = usePathname() ?? "";
  const historyKey = `${HISTORY_KEY_PREFIX}${pathname}`;
  const pageWorkflowRunIds = useAppSelector(selectPageWorkflowRunIds);
  const [history, setHistory] = useState<string[]>(() => readHistory(historyKey));
  const pageRunKey = pageWorkflowRunIds.join(",");
  useEffect(() => {
    const incoming = [...pageWorkflowRunIds, ...(workflowRunId ? [workflowRunId] : [])];
    setHistory((prev) => {
      const fresh = incoming.filter((id) => !prev.includes(id));
      if (!fresh.length) return prev;
      const next = [...prev, ...fresh].slice(-HISTORY_MAX);
      try {
        window.sessionStorage.setItem(historyKey, JSON.stringify(next));
      } catch {
        // Storage full or blocked: the list still holds this tab's runs.
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the joined id list
  }, [pageRunKey, workflowRunId, historyKey]);

  const registry = useAppSelector(selectPageAiRuns);
  const anyLive = registry.some((r) => r.live);
  const [records, setRecords] = useState<AiWatchRunSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const historyScope = history.join(",");
  const listConversation = !historyScope ? conversationId : null;

  useEffect(() => {
    if (!canWatch || legacy || (!historyScope && !listConversation)) return;
    let cancelled = false;
    const load = () =>
      fetchAiWatchRuns({ workflowRunIds: historyScope ? historyScope.split(",") : null, conversationId: listConversation })
        .then((rows) => {
          if (cancelled) return;
          setRecords(rows);
          setListError(null);
        })
        .catch((err: unknown) => {
          // Never swallowed: the list says it could not read the runs.
          if (!cancelled) setListError(err instanceof Error ? err.message : String(err));
        });
    void load();
    // A round keeps adding AI calls while it runs: re-read fast while one is live.
    const timer = setInterval(load, anyLive ? 1500 : 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [canWatch, legacy, historyScope, listConversation, anyLive]);

  const groups = buildRail(registry, records);

  // Selection: a door's target, else the person's pick, else the newest live call. A new run
  // on the page clears the pick, so the window always moves to the round being watched.
  const [picked, setPicked] = useState<string | null>(null);
  const [appliedFocus, setAppliedFocus] = useState<number | null>(null);
  const newestRun = pageWorkflowRunIds.length ? history.at(-1) ?? null : null;
  const [pickRun, setPickRun] = useState<string | null>(newestRun);
  if (newestRun !== pickRun) {
    setPickRun(newestRun);
    setPicked(null);
  }
  const doorTarget = focusKey(groups, registry, { requestId, userRequestId, nodeId, workflowRunId });
  if (focusAt !== appliedFocus && (doorTarget || !(requestId || userRequestId || nodeId))) {
    setAppliedFocus(focusAt);
    if (doorTarget) setPicked(doorTarget);
  }
  const current = picked ?? autoSelection(groups, newestRun);
  const currentRun = registry.find((r) => r.key === current || r.requestIds.includes(current ?? ""));
  const currentCall = groups.flatMap((g) => g.calls).find((c) => c.key === current);
  const serverId = currentRun?.serverRequestId ?? currentCall?.serverId ?? null;

  if (legacy) return null;

  if (!canWatch) {
    return (
      <WindowPanel
        id={`ai-watch-window-${windowInstanceId}`}
        title="Watch AI"
        overlayId="aiWatchWindow"
        overlayInstanceId={windowInstanceId}
        width={420}
        height={180}
        onClose={onClose}
      >
        <div className="p-3 text-xs text-muted-foreground">
          Watch AI is for system admins with debug mode on.
        </div>
      </WindowPanel>
    );
  }

  const callCount = groups.reduce((n, g) => n + g.calls.length, 0);

  return (
    <WindowPanel
      id={`ai-watch-window-${windowInstanceId}`}
      title="Watch AI"
      overlayId="aiWatchWindow"
      overlayInstanceId={windowInstanceId}
      // ONE address entry for the page's one window: ?panels=ai-watch:page
      urlSyncId="page"
      minWidth={520}
      minHeight={320}
      width={1040}
      height="80dvh"
      onClose={onClose}
      onCollectData={() => ({
        windowInstanceId,
        requestId: null,
        userRequestId: serverId,
        workflowRunId: null,
        conversationId,
        nodeId: null,
        label: null,
      })}
      bodyClassName="flex min-h-0 flex-1 overflow-hidden p-0"
    >
      <div className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-border text-xs" data-testid="ai-watch-rail">
        {listError ? (
          <div className="p-2">
            <ErrorNotice title="The runs could not be read" message={listError} />
          </div>
        ) : null}
        {callCount === 0 && !listError ? <div className="p-2 text-muted-foreground">No AI calls on this page yet</div> : null}
        {newestRun && !groups.some((g) => g.workflowRunId === newestRun || g.id === UNRECORDED_GROUP) ? (
          <div className="border-b border-border px-2 py-1.5 text-muted-foreground">This run · no AI call yet</div>
        ) : null}
        {groups.map((group) => (
          <div key={group.id} className="border-b border-border">
            <div className="flex items-center justify-between gap-2 bg-muted/50 px-2 py-1 text-muted-foreground">
              <span className="truncate">
                {group.id === UNRECORDED_GROUP
                  ? "Live"
                  : group.workflowRunId
                    ? group.workflowRunId === (newestRun ?? groups.find((g) => g.workflowRunId)?.workflowRunId)
                      ? "This run"
                      : "Earlier run"
                    : "Chat"}
              </span>
              <span className="shrink-0">{group.startedAt ? runTime(group.startedAt) : ""}</span>
            </div>
            {group.calls.map((call) => (
              <button
                key={call.key}
                type="button"
                onClick={() => setPicked(call.key)}
                data-testid="ai-watch-rail-call"
                className={cn(
                  "flex w-full items-center justify-between gap-2 border-t border-border px-2 py-1.5 text-left hover:bg-muted",
                  call.key === current && "bg-muted font-medium",
                )}
              >
                <span className="flex min-w-0 items-center gap-1">
                  {call.live ? <Eye className="h-3 w-3 shrink-0 text-orange-500" /> : null}
                  <span className="truncate" title={call.label}>{call.label}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">{call.status ?? ""}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {currentCall && groups.find((g) => g.calls.includes(currentCall))?.workflowRunId ? (
          <RunTestReplaysStrip runId={groups.find((g) => g.calls.includes(currentCall))?.workflowRunId as string} />
        ) : null}
        <AiWatchRunView
          key={serverId ?? current ?? "none"}
          serverId={serverId}
          requestIds={currentRun?.requestIds ?? []}
        />
      </div>
    </WindowPanel>
  );
}

function AiWatchRunView({ serverId, requestIds }: { serverId: string | null; requestIds: string[] }) {
  const latestId = requestIds.at(-1) ?? null;
  useRetainRequestForViewer(latestId, "ai-watch-window");
  const byId = useAppSelector((s) => (s as unknown as ActiveRoot).activeRequests.byRequestId);
  const live = requestIds.map((id) => byId[id]).filter(Boolean) as ActiveRequest[];
  const latest = live.at(-1);
  const liveStatus = latest?.status ?? null;
  const liveDone = liveStatus === "complete" || liveStatus === "error" || liveStatus === "cancelled";

  const [record, setRecord] = useState<AiWatchRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The record is written a moment after the run ends; re-read until its snapshot lands.
  const hasLive = Boolean(latest);
  useEffect(() => {
    if (!serverId) return;
    if (hasLive && !liveDone) return;
    let cancelled = false;
    let attempt = 0;
    const load = async () => {
      try {
        const next = await fetchAiWatchRecord(serverId);
        if (cancelled) return;
        setRecord(next);
        setLoadError(null);
        const settled =
          next && next.status !== "pending" && next.status !== "running" && next.snapshots.length > 0;
        if (!settled && attempt++ < 8) setTimeout(load, 1500);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [serverId, hasLive, liveDone]);

  if (!serverId && !latest) {
    return <div className="p-3 text-xs text-muted-foreground">No AI run selected</div>;
  }

  const captures = runCaptures(live, serverId);
  const request = chooseRequestSource(captures.own, record?.snapshots ?? []);
  const identity = mandateIdentity(live, record?.mandateWatch ?? null, serverId);
  const status = liveStatus ?? record?.status ?? "loading";
  const liveError = latest?.error ? (latest.error.user_message ?? latest.error.message ?? null) : null;
  const runError = liveError ?? record?.error ?? null;
  const liveHasOutput = Boolean(latest && (!liveDone || latest.chunkCount > 0));
  const retries = live.flatMap((r) => r.providerRetryHistory ?? []);

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {live.length > 1 ? <span className="text-muted-foreground">Resumed {live.length - 1}×</span> : null}
        {captures.repeats ? (
          <span className="text-muted-foreground">{captures.repeats} replayed calls merged</span>
        ) : null}
        <span className="ml-auto select-all font-mono text-muted-foreground">{serverId ?? "binding…"}</span>
      </div>
      {loadError ? <ErrorNotice title="The run's record could not be read" message={loadError} /> : null}
      {(!latest || liveDone) && runError ? <ErrorNotice title="The run did not finish" message={runError} /> : null}

      <ChatSection
        calls={request.calls}
        liveRequestId={latestId && latest && liveHasOutput ? latestId : null}
        live={Boolean(latest && !liveDone)}
      />

      <MandateSection identity={identity} attributedKey={record?.mandateKey ?? null} record={record} />
      <AdminMetrics live={latest} record={record} calls={request.calls} />

      <Section title={request.source === "recorded" ? "Request · recorded copy (files as markers)" : "Request"}>
        {request.mismatch ? (
          <ErrorNotice
            title="The record is missing calls"
            message={`${request.mismatch.captured} calls went out; the record kept ${request.mismatch.recorded}.`}
          />
        ) : null}
        {request.calls.length === 0 ? (
          <div className="text-muted-foreground">
            {latest && !liveDone ? "Waiting for the first call" : "No recorded request for this run"}
          </div>
        ) : (
          request.calls.map((call) => (
            <RequestView key={call.key} call={call} multiple={request.calls.length > 1} />
          ))
        )}
        {retries.length ? (
          <Block
            label={`Retries (${retries.length})`}
            value={retries.map((r) => ({
              state: r.state,
              provider: r.provider,
              model: r.model ?? null,
              iteration: r.iteration,
              failed_attempt: r.failed_attempt,
              next_attempt: r.next_attempt ?? null,
              reason: r.message,
            }))}
          />
        ) : null}
      </Section>

      {captures.children.length ? (
        <Section title="Sub-agent runs">
          {captures.children.map((child) => (
            <details key={child.requestId} className="rounded border border-border">
              <summary className="cursor-pointer select-none px-2 py-1 font-mono">
                {child.requestId} · {child.calls.length} calls
              </summary>
              <div className="flex flex-col gap-1 p-2">
                {child.calls.map((call) => (
                  <RequestView key={call.key} call={call} multiple />
                ))}
              </div>
            </details>
          ))}
        </Section>
      ) : null}


      {serverId ? <RunActions serverId={serverId} frame={identity.frame} record={record} /> : null}
    </div>
  );
}

/**
 * The run as a chat (VISION Part 18 item 6): system, user message(s), and the assistant's answer
 * — streaming live through the ONE pipeline (`LiveRunDisplay`), or the recorded answer through
 * `MarkdownStream`. Never hand-rendered.
 */
function ChatSection({
  calls,
  liveRequestId,
  live,
}: {
  calls: WatchCall[];
  liveRequestId: string | null;
  live: boolean;
}) {
  const answered = calls.filter((c) => !c.superseded);
  const last = answered.at(-1) ?? null;
  const turns = last?.body ? chatTurns(splitProviderRequest(last.body)) : [];
  const recorded = answered.map((c) => responseText(c.response)).filter(Boolean).join("\n\n");
  return (
    <Section title="Chat">
      <div className="flex flex-col gap-2">
        {turns.length === 0 ? (
          <div className="text-muted-foreground">{live ? "Waiting for the request" : "No request on record"}</div>
        ) : (
          turns.map((turn, i) => (
            <div
              key={i}
              className={cn(
                "rounded-md border border-border p-2",
                turn.role === "user" ? "ml-8 bg-muted/40" : turn.role === "system" ? "bg-card" : "mr-8 bg-card",
              )}
            >
              <div className="mb-1 font-medium capitalize text-muted-foreground">{turn.role}</div>
              {turn.role === "system" ? (
                <details>
                  <summary className="cursor-pointer select-none text-foreground">
                    {turn.text.slice(0, 120)}
                    {turn.text.length > 120 ? "…" : ""}
                  </summary>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-foreground">{turn.text}</pre>
                </details>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-foreground">{turn.text}</pre>
              )}
            </div>
          ))
        )}
        <div className="mr-8 rounded-md border border-border bg-card p-2">
          <div className="mb-1 font-medium text-muted-foreground">Assistant</div>
          {liveRequestId ? (
            <LiveRunDisplay requestId={liveRequestId} variant="bare" bodyClassName="max-h-none" />
          ) : recorded ? (
            <MarkdownStream content={recorded} isStreamActive={false} hideCopyButton />
          ) : (
            <div className="text-muted-foreground">{live ? "Waiting for the answer" : "No answer on record"}</div>
          )}
        </div>
      </div>
    </Section>
  );
}

function MandateSection({
  identity,
  attributedKey,
  record,
}: {
  identity: ReturnType<typeof mandateIdentity>;
  /** The server's own attribution on this run's row (`metadata.mandate_key`), never a door. */
  attributedKey: string | null;
  /** The run's own row: a workflow step's mandate, agent and version when no door frame exists. */
  record: AiWatchRecord | null;
}) {
  const frame = identity.frame;
  const openMandate = useOpenMandateWindow();
  const [version, setVersion] = useState<AiWatchAgentVersion | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [currentDefinition, setCurrentDefinition] = useState<number | null>(null);

  const versionId = frame?.holder_version_id ?? null;
  const mandateId = frame?.mandate_id ?? null;
  useEffect(() => {
    if (!versionId) return;
    let cancelled = false;
    fetchAgentVersion(versionId)
      .then((v) => {
        if (!cancelled) setVersion(v);
      })
      .catch((err: unknown) => {
        if (!cancelled) setVersionError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [versionId]);
  useEffect(() => {
    if (!mandateId) return;
    let cancelled = false;
    fetchMandateDefinitionVersion(mandateId)
      .then((v) => {
        if (!cancelled) setCurrentDefinition(v);
      })
      .catch(() => {
        // The comparison is a hint; the run's own goal is still shown.
        if (!cancelled) setCurrentDefinition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mandateId]);

  if (!frame) {
    if (attributedKey) {
      // A workflow step's mandate run: the step names the mandate, the row names the agent and
      // version that ran (no door frame is built inside a workflow).
      return (
        <Section title="Mandate · workflow step">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded border border-border bg-muted/30 p-2 sm:grid-cols-4">
            <Metric label="Mandate">
              <button
                type="button"
                className="text-primary underline"
                onClick={() => openMandate({ initialMandateKey: storedMandateKey(attributedKey) })}
              >
                {attributedKey}
              </button>
            </Metric>
            <Metric label="Step">{record?.workflowNodeId ?? "—"}</Metric>
            <Metric label="Agent">
              {record?.agentId ? (
                <Link className="text-primary underline" href={`/agents/${record.agentId}`}>
                  {record.agentName ?? record.agentId.slice(0, 8)}
                </Link>
              ) : (
                "—"
              )}
            </Metric>
            <Metric label="Model id">
              <span className="select-all font-mono">{record?.models.join(", ") || "—"}</span>
            </Metric>
          </div>
        </Section>
      );
    }
    return (
      <Section title="Mandate">
        <div className="text-muted-foreground">Not a mandate run (no mandate door)</div>
      </Section>
    );
  }

  const provisions = provisionRows(frame);
  // A turn on a conversation a mandate started: the mandate is not re-resolved and its
  // provision is not re-applied — the frame says so, and carries what the turn DID carry.
  const continuation = continuationView(frame) !== null;
  const changed =
    frame.definition_version != null && currentDefinition != null && currentDefinition !== frame.definition_version;
  const system = systemInstructions(version?.messages);

  return (
    <>
      <Section title={identity.from === "record" ? "Mandate · stored with the run" : "Mandate"}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded border border-border bg-muted/30 p-2 sm:grid-cols-4">
          <Metric label="Mandate">
            <button
              type="button"
              className="text-primary underline"
              onClick={() => openMandate({ initialMandateKey: storedMandateKey(frame.mandate_key) })}
            >
              {frame.mandate_key}
            </button>
          </Metric>
          <Metric label="Door · rung">
            {frame.door} · {continuation ? "not re-resolved" : (frame.rung ?? "—")}
          </Metric>
          <Metric label="Agent">
            {frame.holder_id ? (
              <Link className="text-primary underline" href={`/agents/${frame.holder_id}`}>
                {version?.name ?? frame.holder_id.slice(0, 8)}
              </Link>
            ) : (
              "—"
            )}
          </Metric>
          <Metric label="Version">
            {frame.holder_version_number != null && frame.holder_id ? (
              <Link className="text-primary underline" href={`/agents/${frame.holder_id}/v/${frame.holder_version_number}`}>
                v{frame.holder_version_number}
                {frame.holder_version_live ? " (live)" : " (pinned)"}
              </Link>
            ) : (
              "—"
            )}
          </Metric>
          <Metric label="Provenance">{frame.provenance ?? "real"}</Metric>
          <Metric label="Model id">
            <span className="select-all font-mono">{frame.model_id ?? "—"}</span>
          </Metric>
          <Metric label="Output kind">{frame.output_kind ?? "—"}</Metric>
          <Metric label="Required keys">{(frame.required_output_keys ?? []).join(", ") || "—"}</Metric>
        </div>
      </Section>

      {continuation ? (
        <ContinuationTurn frame={frame} />
      ) : (
        <ProvisionSection title={`Provision · routed at the door (${provisions.length})`} rows={provisions} />
      )}

      {earlierFrames(frame).map((prior, i) => {
        const rows = provisionRows(prior);
        return continuationView(prior) ? (
          <ContinuationTurn key={i} frame={prior} title={`Earlier on this run · ${prior.door}`} />
        ) : (
          <ProvisionSection key={i} title={`Earlier on this run · ${prior.door} · provision (${rows.length})`} rows={rows} />
        );
      })}

      <Section title={changed ? "Goal · definition changed since this run" : "Goal"}>
        <Block label={`Goal (definition v${frame.definition_version ?? "?"})`} value={frame.goal ?? "No goal set"} open />
        {versionId ? (
          versionError ? (
            <ErrorNotice title="The agent version could not be read" message={versionError} />
          ) : (
            <>
              <Block label={`Instructions (v${version?.versionNumber ?? "?"})`} value={system ?? "Not readable here"} />
              <Block label="Output schema" value={version?.outputSchema ?? "None declared"} />
            </>
          )
        ) : (
          <div className="text-muted-foreground">Agent version not recorded</div>
        )}
      </Section>
    </>
  );
}

function ProvisionSection({ title, rows }: { title: string; rows: ProvisionRow[] }) {
  return (
    <Section title={title}>
      {rows.length === 0 ? (
        <div className="text-muted-foreground">No provision values on this run</div>
      ) : (
        rows.map((p) => (
          <Block
            key={p.name}
            label={`${p.name} · ${p.kind}${p.supplied ? "" : " · not supplied"} → ${p.landed}`}
            value={p.inline ? p.value : `Not inlined (${p.ref ?? "no value"})`}
          />
        ))
      )}
    </Section>
  );
}

/** What a continuation turn carried: its author, its words or host line, its context. */
function ContinuationTurn({ frame, title }: { frame: MandateRunData; title?: string }) {
  const view = continuationView(frame);
  if (!view) return null;
  const { context } = view;
  return (
    <Section title={title ?? "This turn · provision not re-applied"}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded border border-border bg-muted/30 p-2 sm:grid-cols-3">
        <Metric label="Written by">{view.author}</Metric>
        <Metric label="Host reason">{view.hostReason ?? "—"}</Metric>
        <Metric label="Started by run">
          <span className="select-all font-mono">{view.startedBy ?? "—"}</span>
        </Metric>
      </div>
      {view.input != null ? <Block label="Turn input" value={view.input} open /> : null}
      {context.length === 0 ? (
        <div className="text-muted-foreground">No context on this turn</div>
      ) : (
        context.map(([key, value]) => <Block key={key} label={`${key} · context`} value={value} />)
      )}
    </Section>
  );
}

interface ProvisionRow {
  name: string;
  kind: string;
  supplied: boolean;
  landed: string;
  inline: boolean;
  value: unknown;
  ref: string | null;
}

function provisionRows(frame: MandateRunData): ProvisionRow[] {
  const placement = frame.placement as { provisions?: unknown[] } | null | undefined;
  const items = Array.isArray(placement?.provisions) ? placement.provisions : [];
  return items.map((raw, i) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const landed = Array.isArray(p.landed)
      ? (p.landed as Array<Record<string, unknown>>).map((l) => `${l.channel}:${l.target}`).join(", ")
      : "unconsumed";
    return {
      name: typeof p.name === "string" ? p.name : `value ${i + 1}`,
      kind: typeof p.kind === "string" ? p.kind : "?",
      supplied: p.supplied !== false,
      landed: landed || "unconsumed",
      inline: "value" in p,
      value: p.value,
      ref: typeof p.value_ref === "string" ? p.value_ref : null,
    };
  });
}

function systemInstructions(messages: unknown): unknown {
  if (!Array.isArray(messages)) return null;
  const system = messages.filter((m) => {
    const role = (m as { role?: unknown })?.role;
    return role === "system" || role === "developer";
  });
  return system.length ? system : null;
}

function RunActions({
  serverId,
  frame,
  record,
}: {
  serverId: string;
  frame: MandateRunData | null;
  record: AiWatchRecord | null;
}) {
  const openFeedback = useOpenFeedbackWindow();
  const holderId = frame?.holder_id ?? record?.agentId ?? null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
      {holderId ? (
        <Button variant="outline" icon={<Wrench />} asChild>
          <Link href={`/agents/${holderId}/build`}>Improve this agent</Link>
        </Button>
      ) : null}
      <Button
        variant="outline"
        icon={<Send />}
        onClick={() =>
          openFeedback({
            title: "Send to developers",
            subject: {
              kind: "ai_run",
              userRequestId: serverId,
              mandateKey: frame?.mandate_key ? storedMandateKey(frame.mandate_key) : null,
              conversationId: frame?.conversation_id ?? record?.conversationId ?? null,
              holderId,
              holderVersionId: frame?.holder_version_id ?? null,
            },
          })
        }
      >
        Send to developers
      </Button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "complete" || status === "completed"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "error" || status === "failed"
        ? "bg-destructive/15 text-destructive"
        : "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  return <span className={cn("rounded px-1.5 py-0.5 font-medium", tone)}>{status}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Block({ label, value, open = false }: { label: string; value: unknown; open?: boolean }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <details open={open} className="rounded border border-border">
      <summary className="cursor-pointer select-none px-2 py-1 font-medium">{label}</summary>
      <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words border-t border-border p-2 font-mono text-[11px]">
        {text}
      </pre>
    </details>
  );
}

function RequestView({ call, multiple }: { call: WatchCall; multiple: boolean }) {
  const parts = splitProviderRequest(call.body);
  return (
    <div className={cn("flex flex-col gap-1", call.superseded && "opacity-60")}>
      {multiple || call.superseded || (call.attempt ?? 1) > 1 ? (
        <div className="text-muted-foreground">
          Call {call.iteration ?? "?"}
          {call.attempt != null ? ` · attempt ${call.attempt}` : ""} · {call.provider ?? ""} {call.model ?? ""}
          {call.superseded ? " · retried, not the answer" : ""}
        </div>
      ) : null}
      {call.body && !parts.shape ? (
        <Block label="Request (raw)" value={call.body} open />
      ) : call.body ? (
        <>
          <Block label="System / instructions" value={parts.system ?? "Not set in this request"} open={!call.superseded} />
          <Block label={`Messages and inputs (${parts.messages.length})`} value={parts.messages} open={!call.superseded} />
          <Block label={`Tools offered (${parts.tools.length})`} value={parts.tools} />
          <Block label="Settings" value={parts.settings} />
        </>
      ) : call.raw ? (
        <Block label={call.truncated ? "Request (large — full copy on the record after the run)" : "Request"} value={call.raw} open />
      ) : null}
    </div>
  );
}

function AdminMetrics({
  live,
  record,
  calls,
}: {
  live: ActiveRequest | undefined;
  record: AiWatchRecord | null;
  calls: WatchCall[];
}) {
  // The server's numbers — the same ones the creator panel and battles show.
  const result = getUserRequestResult(live);
  const usage = result?.total_usage?.total;
  const timing = result?.timing_stats as { total_duration?: number } | undefined;
  const inTokens = record?.inputTokens ?? usage?.input_tokens ?? null;
  const outTokens = record?.outputTokens ?? usage?.output_tokens ?? null;
  const cost = record?.totalCost ?? usage?.total_cost ?? null;
  const ttft = record?.ttftMs ?? requestTtftMs(live);
  const totalMs =
    record?.totalDurationMs ?? (timing?.total_duration != null ? timing.total_duration * 1000 : null);
  const models = record?.models.length
    ? record.models
    : Array.from(new Set(calls.map((c) => c.model).filter(Boolean) as string[]));
  const answering = calls.filter((c) => !c.superseded).length;
  const rate = currentPointsRate();

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded border border-border bg-muted/30 p-2 sm:grid-cols-4">
      <Metric label="Model">{models.join(", ") || "—"}</Metric>
      <Metric label="Tokens in / out">
        {fmtTokens(inTokens)} / {fmtTokens(outTokens)}
      </Metric>
      <Metric label="Cost">
        {formatCost(cost, { unit: "usd", rate })} · {formatCost(cost, { unit: "points", rate })}
      </Metric>
      <Metric label="Provider calls">{answering || "—"}</Metric>
      <Metric label="First token">{fmtMs(ttft)}</Metric>
      <Metric label="Total time">{fmtMs(totalMs)}</Metric>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
