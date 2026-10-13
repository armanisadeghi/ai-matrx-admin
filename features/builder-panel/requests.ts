/**
 * Builder panel — every request in the flow as ONE ordered list, and the Activity timeline over it.
 *
 * Two sources, both untouched: the page's own requests (`requestLog.ts`, client → server) and the
 * server's external calls each workflow node recorded on its output (`output.requests`, the
 * aidream request ledger: search engines, page fetches, the scraper, social lookups), read from
 * `workflow.node_outcome`. A row carries the request and response objects exactly as stored; the
 * row's title is the only thing written here. FEATURE: ./FEATURE.md.
 */
import type { Json } from "@/types/database.types";
import type { LoggedRequest } from "./requestLog";
import type { NodeOutcomeRow, RunRow, SnapshotRow } from "./data";

export type RequestSide = "page" | "server";

export interface RequestRow {
  id: string;
  side: RequestSide;
  /** Epoch ms the request left. */
  at: number;
  ms: number | null;
  /** search · page_fetch · scrape · social_profile · http */
  kind: string;
  provider: string;
  title: string;
  status: number | string | null;
  error: string | null;
  runId: string | null;
  nodeId: string | null;
  /** The request exactly as sent (secrets redacted). */
  request: unknown;
  /** The response exactly as received. */
  response: unknown;
}

function record(value: Json | unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function pageRequestRows(log: LoggedRequest[], route: string | null): RequestRow[] {
  return log
    .filter((r) => !route || r.route === route)
    .map((r) => ({
      id: `page:${r.seq}`,
      side: "page" as const,
      at: r.startedAt,
      ms: r.endedAt ? r.endedAt - r.startedAt : null,
      kind: "http",
      provider: hostOf(r.url),
      title: `${r.method} ${pathOf(r.url)}`,
      status: r.status,
      error: r.error,
      runId: null,
      nodeId: null,
      request: { method: r.method, url: r.url, headers: r.requestHeaders, body: r.requestBody },
      response: {
        status: r.status,
        statusText: r.statusText,
        headers: r.responseHeaders,
        body: r.responseBody,
        ...(r.streaming ? { streaming: true } : {}),
      },
    }));
}

export function serverRequestRows(outcomes: NodeOutcomeRow[]): RequestRow[] {
  const rows: RequestRow[] = [];
  for (const o of outcomes) {
    const list = record(o.output).requests;
    if (!Array.isArray(list)) continue;
    list.forEach((raw, i) => {
      const r = record(raw);
      const ended = typeof r.at === "string" ? Date.parse(r.at) : Date.parse(o.completedAt);
      const ms = typeof r.ms === "number" ? r.ms : null;
      rows.push({
        id: `server:${o.runId}:${o.nodeId}:${o.itemIndex}:${typeof r.seq === "number" ? r.seq : i + 1}`,
        side: "server",
        at: ms !== null ? ended - ms : ended,
        ms,
        kind: String(r.kind ?? "http"),
        provider: String(r.provider ?? ""),
        title: typeof r.label === "string" && r.label ? r.label : `${String(r.kind ?? "request")} ${String(r.provider ?? "")}`,
        status: typeof r.status === "number" || typeof r.status === "string" ? r.status : null,
        error: typeof r.error === "string" ? r.error : null,
        runId: o.runId,
        nodeId: o.nodeId,
        request: r.request ?? null,
        response: r.response ?? null,
      });
    });
  }
  return rows;
}

export function allRequestRows(pageRows: RequestRow[], serverRows: RequestRow[]): RequestRow[] {
  return [...pageRows, ...serverRows].sort((a, b) => a.at - b.at);
}

// ── Activity ─

const FLOW_PATH = /\/workflows\/|\/provision-window\/|\/runs(\/|$|\?)/;
const WRITE = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** What the flow DID: every server-side call, the page's calls that start or follow work (runs,
 *  provision captures) and its record writes. Session chatter (reads, RPC lookups, telemetry)
 *  stays in Requests only. */
export function isFlowRequest(r: RequestRow): boolean {
  if (r.side === "server") return true;
  const req = r.request as { method?: string; url?: string } | null;
  const url = req?.url ?? "";
  if (FLOW_PATH.test(url)) return true;
  return WRITE.has(req?.method ?? "") && /\/rest\/v1\/(?!rpc\/)/.test(url);
}

export interface ActivityRow {
  id: string;
  at: number;
  /** request · step · gate · provision · run */
  kind: string;
  title: string;
  /** Hard cost in USD when the step reported one. */
  costUsd: number | null;
  ms: number | null;
  status: string | null;
  requestId: string | null;
  runId: string | null;
  nodeId: string | null;
  snapshotId: string | null;
}

const KIND_VERB: Record<string, string> = {
  search: "Searched",
  page_fetch: "Fetched",
  scrape: "Scraped",
  social_profile: "Looked up",
};

export function activityRows(
  requests: RequestRow[],
  runs: RunRow[],
  outcomes: NodeOutcomeRow[],
  snapshots: SnapshotRow[],
  nodeLabels: Record<string, string>,
): ActivityRow[] {
  const out: ActivityRow[] = [];
  for (const r of requests.filter(isFlowRequest)) {
    const verb = r.side === "server" ? KIND_VERB[r.kind] : null;
    out.push({
      id: `a:${r.id}`,
      at: r.at,
      kind: "request",
      title: verb ? `${verb}: ${r.title}` : r.title,
      costUsd: null,
      ms: r.ms,
      status: r.error ? "failed" : r.status === null ? "pending" : String(r.status),
      requestId: r.id,
      runId: r.runId,
      nodeId: r.nodeId,
      snapshotId: null,
    });
  }
  for (const run of runs) {
    out.push({
      id: `a:run:${run.id}`,
      at: Date.parse(run.startedAt ?? run.createdAt),
      kind: "run",
      title: `Run started`,
      costUsd: null,
      ms: run.completedAt ? Date.parse(run.completedAt) - Date.parse(run.startedAt ?? run.createdAt) : null,
      status: run.status,
      requestId: null,
      runId: run.id,
      nodeId: null,
      snapshotId: null,
    });
  }
  for (const o of outcomes) {
    const output = record(o.output);
    const cost = typeof output.cost_usd === "number" ? output.cost_usd : null;
    const skipped = output.skipped === true;
    out.push({
      id: `a:step:${o.id}`,
      at: Date.parse(o.completedAt),
      kind: "step",
      title: `${skipped ? "Skipped" : "Finished"}: ${nodeLabels[o.nodeId] ?? o.nodeId}`,
      costUsd: cost,
      ms: o.durationMs,
      status: o.error ? "failed" : skipped ? "skipped" : "done",
      requestId: null,
      runId: o.runId,
      nodeId: o.nodeId,
      snapshotId: null,
    });
    const gate = record(output.gate);
    if (typeof gate.type === "string") {
      out.push({
        id: `a:gate:${o.id}`,
        at: Date.parse(o.completedAt),
        kind: "gate",
        title: `Gate detected: ${gate.type}`,
        costUsd: null,
        ms: null,
        status: null,
        requestId: null,
        runId: o.runId,
        nodeId: o.nodeId,
        snapshotId: null,
      });
    }
  }
  for (const s of snapshots) {
    out.push({
      id: `a:snap:${s.id}`,
      at: Date.parse(s.createdAt),
      kind: "provision",
      title: `Provision captured: ${s.pointKey}`,
      costUsd: null,
      ms: null,
      status: null,
      requestId: null,
      runId: s.runId,
      nodeId: null,
      snapshotId: s.id,
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

/** A request or step duration, exact below a second. */
export function msText(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}
