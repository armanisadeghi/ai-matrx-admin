"use client";

/**
 * AiWatchWindow — "AI is never hidden" (Arman, 2026-10-11).
 *
 * Any AI run, started anywhere (chat, a feature, a workflow node, a mandate, a
 * tool), can be watched here: the EXACT provider request (system, messages and
 * inputs, tools offered, settings) and the response as it streams, plus status.
 * System admins also see agent/mandate, model, tokens, time to first token,
 * total time, cost (dollars to the cent, points beside) and the ids.
 *
 * Sources, in order:
 *  - live: `state.activeRequests[requestId]` — the response renders through
 *    the canonical `LiveRunDisplay` (never hand-rendered), and the exact
 *    provider request arrives as the `context_analysis` wire capture on the
 *    same stream, BEFORE the first token.
 *  - recorded: `chat.user_request` + `chat.request_snapshot` by the server id,
 *    so the window reopens after a refresh with what went in and came out.
 *
 * Open it with ONE call: `useWatchAiRun()(…)` / `watchAiRunAction(…)`
 * (features/overlays/openers/aiWatchWindow.tsx).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCost } from "@ai-matrx/kit/format";
import { LiveRunDisplay } from "@ai-matrx/chat/agents/components/live-run/LiveRunDisplay";
import { useRetainRequestForViewer } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/useRetainRequestForViewer";
import {
  fmtMs,
  fmtTokens,
  getUserRequestResult,
  requestTtftMs,
} from "@ai-matrx/chat/agents/components/run-controls/panels/shared";
import type { ActiveRequest } from "@ai-matrx/chat/agents/types/request.types";
import { cn, ErrorNotice } from "@ai-matrx/design-system";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { currentPointsRate } from "@/components/cost/pointsRate";
import {
  fetchAiWatchRecord,
  fetchAiWatchRuns,
  responseText,
  splitProviderRequest,
  type AiWatchRecord,
  type AiWatchRunSummary,
} from "@/features/ai-watch/ai-watch-records";

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
  label?: string | null;
}

interface WireCapture {
  provider?: string | null;
  model?: string | null;
  iteration?: number | null;
  attempt?: number | null;
  body?: Record<string, unknown> | null;
  body_raw?: string | null;
  body_size_bytes?: number | null;
}

type RootLike = {
  activeRequests: { byRequestId: Record<string, ActiveRequest> };
  observability: {
    userRequestsByConversationId: Record<string, string[]>;
    userRequests: Record<string, { createdAt?: string | null }>;
  };
};

const EMPTY_CAPTURES: WireCapture[] = [];

function selectWireCaptures(request: ActiveRequest | undefined): WireCapture[] {
  if (!request?.timeline?.length) return EMPTY_CAPTURES;
  const out: WireCapture[] = [];
  for (const entry of request.timeline) {
    const e = entry as { kind: string; originalEvent?: string; rawData?: unknown };
    if (e.kind === "unknown" && e.originalEvent === "context_analysis" && e.rawData) {
      out.push(e.rawData as WireCapture);
    }
  }
  return out.length ? out : EMPTY_CAPTURES;
}

/** The server run id of a live request: the conversation's newest reservation since it started. */
function useLiveUserRequestId(request: ActiveRequest | undefined): string | null {
  const conversationId = request?.conversationId ?? "";
  const ids = useAppSelector(
    (s) => (s as unknown as RootLike).observability?.userRequestsByConversationId?.[conversationId],
  );
  const byId = useAppSelector((s) => (s as unknown as RootLike).observability?.userRequests);
  if (!request || !ids?.length || !byId) return null;
  const started = Date.parse(String((request as { startedAt?: unknown }).startedAt ?? "")) || 0;
  for (let i = ids.length - 1; i >= 0; i--) {
    const created = Date.parse(byId[ids[i]]?.createdAt ?? "") || 0;
    if (!started || created >= started - 5000) return ids[i];
  }
  return null;
}

export default function AiWatchWindow({
  windowInstanceId,
  onClose,
  requestId = null,
  userRequestId = null,
  workflowRunId = null,
  conversationId = null,
  label = null,
}: AiWatchWindowProps) {
  const [runs, setRuns] = useState<AiWatchRunSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(userRequestId);
  const listScope = workflowRunId || (!requestId && !userRequestId ? conversationId : null);

  useEffect(() => {
    if (!listScope) return;
    let cancelled = false;
    const load = () =>
      fetchAiWatchRuns({ workflowRunId, conversationId })
        .then((rows) => {
          if (cancelled) return;
          setRuns(rows);
          setSelectedId((cur) => cur ?? rows.at(-1)?.userRequestId ?? null);
        })
        .catch(() => {});
    void load();
    // A flow keeps adding AI steps while it runs.
    const timer = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [listScope, workflowRunId, conversationId]);

  const live = useAppSelector((s) =>
    requestId ? (s as unknown as RootLike).activeRequests.byRequestId[requestId] : undefined,
  );
  const liveUserRequestId = useLiveUserRequestId(live);
  const recordId = selectedId ?? liveUserRequestId ?? null;
  const showLive = Boolean(requestId && live && (!selectedId || selectedId === liveUserRequestId));

  const title = label ? `Watch AI — ${label}` : "Watch AI";

  return (
    <WindowPanel
      id={`ai-watch-window-${windowInstanceId}`}
      title={title}
      overlayId="aiWatchWindow"
      overlayInstanceId={windowInstanceId}
      minWidth={420}
      minHeight={320}
      width={920}
      height="80dvh"
      onClose={onClose}
      onCollectData={() => ({
        windowInstanceId,
        requestId,
        userRequestId: recordId,
        workflowRunId,
        conversationId,
        label,
      })}
      bodyClassName="flex min-h-0 flex-1 overflow-hidden p-0"
    >
      {runs.length > 1 ? (
        <div className="flex w-48 shrink-0 flex-col overflow-y-auto border-r border-border text-xs">
          {runs.map((run) => (
            <button
              key={run.userRequestId}
              type="button"
              onClick={() => setSelectedId(run.userRequestId)}
              className={cn(
                "flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 text-left hover:bg-muted",
                run.userRequestId === recordId && "bg-muted font-medium",
              )}
            >
              <span className="truncate">{run.label}</span>
              <span className="shrink-0 text-muted-foreground">{run.status ?? ""}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <AiWatchRunView
          requestId={showLive ? requestId : null}
          live={showLive ? live : undefined}
          userRequestId={recordId}
        />
      </div>
    </WindowPanel>
  );
}

function AiWatchRunView({
  requestId,
  live,
  userRequestId,
}: {
  requestId: string | null;
  live: ActiveRequest | undefined;
  userRequestId: string | null;
}) {
  useRetainRequestForViewer(requestId, "ai-watch-window");
  const isAdmin = useAppSelector(selectIsSuperAdminDebugger);
  const captures = selectWireCaptures(live);
  const liveStatus = live?.status ?? null;
  const liveDone = liveStatus === "complete" || liveStatus === "error";

  const [record, setRecord] = useState<AiWatchRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The record is written by the server's persistence queue a moment after the
  // run ends; re-read until its request snapshot lands (or the run is over long enough).
  useEffect(() => {
    if (!userRequestId) return;
    if (live && !liveDone) return;
    let cancelled = false;
    let attempt = 0;
    const load = async () => {
      try {
        const next = await fetchAiWatchRecord(userRequestId);
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
  }, [userRequestId, live, liveDone]);

  const iterations = useMemo(() => {
    if (record?.snapshots.length) {
      return record.snapshots.map((s) => ({
        key: s.id,
        iteration: s.iteration,
        provider: s.provider,
        model: typeof s.requestPayload?.model === "string" ? s.requestPayload.model : null,
        attempt: null as number | null,
        body: s.requestPayload,
        raw: null as string | null,
        truncated: false,
        response: s.responsePayload,
      }));
    }
    return captures.map((c, i) => ({
      key: `wire-${i}`,
      iteration: c.iteration ?? null,
      provider: c.provider ?? null,
      model: c.model ?? (typeof c.body?.model === "string" ? c.body.model : null),
      attempt: c.attempt ?? null,
      body: c.body ?? null,
      raw: c.body_raw ?? null,
      truncated: !c.body && Boolean(c.body_raw),
      response: null as Record<string, unknown> | null,
    }));
  }, [record, captures]);

  if (!requestId && !userRequestId) {
    return <div className="p-3 text-xs text-muted-foreground">No AI run selected</div>;
  }

  const status = liveStatus ?? record?.status ?? "loading";

  return (
    <div className="flex flex-col gap-2 p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {record?.mandateKey || record?.sourceFeature ? (
          <span className="text-muted-foreground">{record.mandateKey ?? record.sourceFeature}</span>
        ) : null}
      </div>
      {loadError ? <ErrorNotice title="The run's record could not be read" message={loadError} /> : null}

      {isAdmin ? (
        <AdminMetrics live={live} record={record} iterations={iterations} userRequestId={userRequestId} requestId={requestId} />
      ) : null}

      <Section title="Request">
        {iterations.length === 0 ? (
          <div className="text-muted-foreground">
            {live && !liveDone ? "Waiting for the request to leave the server" : "No recorded request for this run"}
          </div>
        ) : (
          iterations.map((it) => (
            <RequestView
              key={it.key}
              iteration={it.iteration}
              provider={it.provider}
              model={it.model}
              body={it.body}
              raw={it.raw}
              truncated={it.truncated}
              multiple={iterations.length > 1}
            />
          ))
        )}
      </Section>

      <Section title="Response">
        {requestId && live ? (
          <LiveRunDisplay requestId={requestId} variant="bare" bodyClassName="max-h-none" />
        ) : record ? (
          iterations.map((it) => (
            <pre key={it.key} className="whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px]">
              {responseText(it.response) || JSON.stringify(it.response ?? {}, null, 2)}
            </pre>
          ))
        ) : (
          <div className="text-muted-foreground">Loading</div>
        )}
      </Section>
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

function RequestView({
  iteration,
  provider,
  model,
  body,
  raw,
  truncated,
  multiple,
}: {
  iteration: number | null;
  provider: string | null;
  model: string | null;
  body: Record<string, unknown> | null;
  raw: string | null;
  truncated: boolean;
  multiple: boolean;
}) {
  const parts = splitProviderRequest(body);
  return (
    <div className="flex flex-col gap-1">
      {multiple ? (
        <div className="text-muted-foreground">
          Call {iteration ?? "?"} · {provider ?? ""} {model ?? ""}
        </div>
      ) : null}
      {body ? (
        <>
          <Block label="System / instructions" value={parts.system ?? "(none)"} open />
          <Block label={`Messages and inputs (${parts.messages.length})`} value={parts.messages} open />
          <Block label={`Tools offered (${parts.tools.length})`} value={parts.tools} />
          <Block label="Settings" value={parts.settings} />
        </>
      ) : raw ? (
        <Block label={truncated ? "Request (large — full copy on the record after the run)" : "Request"} value={raw} open />
      ) : null}
    </div>
  );
}

function AdminMetrics({
  live,
  record,
  iterations,
  userRequestId,
  requestId,
}: {
  live: ActiveRequest | undefined;
  record: AiWatchRecord | null;
  iterations: { model: string | null; provider: string | null }[];
  userRequestId: string | null;
  requestId: string | null;
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
    : Array.from(new Set(iterations.map((i) => i.model).filter(Boolean) as string[]));
  const calls = iterations.length;
  const rate = currentPointsRate();

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded border border-border bg-muted/30 p-2 sm:grid-cols-4">
      <Metric label="Agent">
        {record?.agentId ? (
          <Link className="text-primary underline" href={`/agents/${record.agentId}`}>
            {record.mandateKey ?? "Open agent"}
          </Link>
        ) : (
          "—"
        )}
      </Metric>
      <Metric label="Model">{models.join(", ") || "—"}</Metric>
      <Metric label="Tokens in / out">
        {fmtTokens(inTokens)} / {fmtTokens(outTokens)}
      </Metric>
      <Metric label="Cost">
        {formatCost(cost, { unit: "usd", rate })} · {formatCost(cost, { unit: "points", rate })}
      </Metric>
      <Metric label="First token">{fmtMs(ttft)}</Metric>
      <Metric label="Total time">{fmtMs(totalMs)}</Metric>
      <Metric label="Provider calls">{calls ? `${calls}${calls > 1 ? ` (${calls - 1} more after the first)` : ""}` : "—"}</Metric>
      <Metric label="Run id">
        <span className="select-all font-mono">{userRequestId ?? requestId ?? "—"}</span>
      </Metric>
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
