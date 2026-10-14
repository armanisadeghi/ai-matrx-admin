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
import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
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
import { useAppSelector } from "@/lib/redux/hooks";
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
  /** List every AI run this tab holds (the sidebar light). */
  /** Open on this workflow step's call (from the Workflow run rail). */
  nodeId?: string | null;
  pageRuns?: boolean;
  label?: string | null;
}

type ActiveRoot = { activeRequests: { byRequestId: Record<string, ActiveRequest> } };

/** One entry of the left rail: a run by its server id (or client id until bound). */
interface RailRun {
  key: string;
  serverId: string | null;
  label: string;
  status: string | null;
  live: boolean;
}

function railFromRegistry(runs: WatchableRun[], conversationId: string | null): RailRun[] {
  return runs
    .filter((r) => !conversationId || r.conversationId === conversationId)
    .map((r) => ({
      key: r.key,
      serverId: r.serverRequestId,
      label: r.mandateRun?.mandate_key ?? "AI run",
      status: r.live ? "live" : null,
      live: r.live,
    }));
}

export default function AiWatchWindow({
  windowInstanceId,
  onClose,
  requestId = null,
  userRequestId = null,
  workflowRunId = null,
  conversationId = null,
  pageRuns = false,
  nodeId = null,
  label = null,
}: AiWatchWindowProps) {
  const canWatch = useCanWatchAi();
  const [records, setRecords] = useState<AiWatchRunSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  // The page's workflow runs: their AI steps are read from the record, so the list outlives
  // the live rows (a finished run's lanes are released; its calls stay listed).
  const pageWorkflowRunIds = useAppSelector(selectPageWorkflowRunIds);
  const pageRunKey = pageRuns ? pageWorkflowRunIds.join(",") : "";
  const listScope = workflowRunId || pageRunKey || (!requestId && !userRequestId ? conversationId : null);

  useEffect(() => {
    if (!canWatch || !listScope) return;
    let cancelled = false;
    const load = () =>
      fetchAiWatchRuns({
        workflowRunId,
        workflowRunIds: pageRunKey ? pageRunKey.split(",") : null,
        conversationId,
      })
        .then((rows) => {
          if (cancelled) return;
          setRecords(rows);
          setListError(null);
        })
        .catch((err: unknown) => {
          // Never swallowed: the rail says it could not read the runs.
          if (!cancelled) setListError(err instanceof Error ? err.message : String(err));
        });
    void load();
    // A flow keeps adding AI steps while it runs.
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [canWatch, listScope, workflowRunId, conversationId, pageRunKey]);

  // The tab's own runs, keyed by server run (never a conversation's "newest").
  const registry = useAppSelector(selectPageAiRuns);
  const opened = useAppSelector((s) =>
    requestId ? (s as unknown as ActiveRoot).activeRequests.byRequestId[requestId] : undefined,
  );

  // The run this window opened on: by its server id, or by its client request until bound.
  const openedKey = userRequestId ?? opened?.serverRequestId ?? requestId ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(openedKey);
  useEffect(() => {
    // The opened request learns its server id from its own stream: follow it.
    if (opened?.serverRequestId && selectedKey === requestId) setSelectedKey(opened.serverRequestId);
  }, [opened?.serverRequestId, requestId, selectedKey]);

  const rail: RailRun[] = [];
  if (pageRuns || (conversationId && !requestId && !userRequestId)) {
    rail.push(...railFromRegistry(registry, pageRuns ? null : conversationId));
  }
  for (const r of records) {
    if (!rail.some((x) => x.serverId === r.userRequestId)) {
      rail.push({ key: r.userRequestId, serverId: r.userRequestId, label: r.label, status: r.status, live: false });
    }
  }
  // Opened from a Workflow run step: that step's newest call, until the person picks another.
  const stepCall = nodeId ? records.filter((r) => r.nodeId === nodeId).at(-1)?.userRequestId ?? null : null;
  rail.sort((a, b) => Number(b.live) - Number(a.live));
  if (pageRuns && !rail.some((r) => r.live)) rail.reverse();
  const current = selectedKey ?? stepCall ?? rail[0]?.key ?? null;
  const currentRun = registry.find((r) => r.key === current || r.requestIds.includes(current ?? ""));
  const serverId =
    currentRun?.serverRequestId ?? rail.find((r) => r.key === current)?.serverId ?? (current && current === userRequestId ? current : null);

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

  return (
    <WindowPanel
      id={`ai-watch-window-${windowInstanceId}`}
      title={label ? `Watch AI — ${label}` : "Watch AI"}
      overlayId="aiWatchWindow"
      overlayInstanceId={windowInstanceId}
      // The address keeps the watched run after a refresh: ?panels=ai-watch:<c|u|w|r>-<id>
      urlSyncId={
        workflowRunId
          ? `w-${workflowRunId}`
          : serverId
            ? `u-${serverId}`
            : conversationId
              ? `c-${conversationId}`
              : requestId
                ? `r-${requestId}`
                : undefined
      }
      minWidth={420}
      minHeight={320}
      width={960}
      height="80dvh"
      onClose={onClose}
      onCollectData={() => ({
        windowInstanceId,
        requestId,
        userRequestId: serverId,
        workflowRunId,
        conversationId,
        label,
      })}
      bodyClassName="flex min-h-0 flex-1 overflow-hidden p-0"
    >
      {rail.length > 1 || listError ? (
        <div className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-border text-xs">
          {listError ? (
            <div className="p-2">
              <ErrorNotice title="The runs could not be read" message={listError} />
            </div>
          ) : null}
          {rail.map((run) => (
            <button
              key={run.key}
              type="button"
              onClick={() => setSelectedKey(run.key)}
              className={cn(
                "flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-left hover:bg-muted",
                run.key === current && "bg-muted font-medium",
              )}
            >
              <span className="flex min-w-0 items-center gap-1">
                {run.live ? <Eye className="h-3 w-3 shrink-0 text-orange-500" /> : null}
                <span className="truncate">{run.label}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{run.status ?? ""}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {workflowRunId ? <RunTestReplaysStrip runId={workflowRunId} /> : null}
        <AiWatchRunView
          key={serverId ?? current ?? "none"}
          serverId={serverId}
          requestIds={currentRun?.requestIds ?? (requestId && current === requestId ? [requestId] : [])}
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
