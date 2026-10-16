"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { formatRelativeTime } from "@/utils/datetime";
import {
  cancelVerification,
  loadToolDetail,
  setToolPaused,
  turnOffEndpoint,
  turnOnEndpoint,
  verifyEndpoint,
} from "./service";
import { TOOL_CONTROL_PATH, TOOL_CONTROL_QUERY_KEY } from "./paths";
import { UptimeStrip } from "./UptimeStrip";
import type { EndpointRow, ScorecardRow, StripRow } from "./types";
import { isCheckRequired, mergeHistory, speedLabel, stateWords, successLabel, type HistoryLine } from "./words";

interface SourceRow {
  ep: EndpointRow;
  name: string;
  card7: ScorecardRow | undefined;
  card30: ScorecardRow | undefined;
  strip: StripRow[];
}

const ago = (t: string | null | undefined) => (t ? formatRelativeTime(t) : "Never");

export function ToolDetail({ toolId }: { toolId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [...TOOL_CONTROL_QUERY_KEY, "tool", toolId], queryFn: () => loadToolDetail(toolId), refetchOnWindowFocus: true });
  const [busy, setBusy] = useState<string | null>(null);
  const data = query.data;
  const loading = query.isFetching && !data;
  const error = query.error ? extractErrorMessage(query.error) : null;

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
  };

  /** One action, one spinner, one honest answer; the dock and this page both refresh afterwards. */
  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      toast.error("That did not happen", { description: extractErrorMessage(err) });
    } finally {
      setBusy(null);
      await refreshAll();
    }
  };

  const verify = (ep: EndpointRow, name: string, thenTurnOn: boolean) =>
    run(`verify:${ep.id}`, async () => {
      const ok = await confirm({
        title: `Check ${name}?`,
        description: thenTurnOn
          ? "Makes one real call. A source is turned on only after a real call succeeds."
          : "Makes one real call. If it works, the source turns on.",
        confirmLabel: "Run check",
      });
      if (!ok) return;
      const result = await verifyEndpoint(ep.id);
      if (result.passed) toast.success(result.message);
      else toast.error(result.message);
    });

  const turnOn = (ep: EndpointRow, name: string) =>
    run(`on:${ep.id}`, async () => {
      const result = await turnOnEndpoint(ep.id);
      if (result.changed) return void toast.success("Turned on");
      if (isCheckRequired(result.refusal)) {
        toast.info("Run a check first", { description: result.message });
        return;
      }
      toast.error(result.message);
    }).then(() => undefined, () => undefined).finally(() => void name);

  const turnOff = (ep: EndpointRow, name: string) =>
    run(`off:${ep.id}`, async () => {
      const ok = await confirm({
        title: `Turn off ${name}?`,
        description: "Calls stop using this source. It stays off until a check passes.",
        confirmLabel: "Turn off",
      });
      if (!ok) return;
      const result = await turnOffEndpoint(ep.id, "paused");
      toast.success(`Now ${result.state}`);
    });

  const cancel = (ep: EndpointRow) =>
    run(`cancel:${ep.id}`, async () => {
      const result = await cancelVerification(ep.id);
      toast.success(result.message);
    });

  const names = new Map((data?.providers ?? []).map((p) => [p.slug, p.admin_name]));
  const sources: SourceRow[] = (data?.endpoints ?? [])
    .filter((ep) => ep.state !== "retired")
    .map((ep) => ({
      ep,
      name: `${names.get(ep.provider_slug) ?? ep.provider_slug}${ep.via === "treg" ? " (aggregator)" : ""}`,
      card7: data?.cards7.find((c) => c.endpoint_id === ep.id),
      card30: data?.cards30.find((c) => c.endpoint_id === ep.id),
      strip: (data?.strips ?? []).filter((s) => s.endpoint_id === ep.id),
    }));
  const history: HistoryLine[] = data ? mergeHistory(data.entry, data.endpoints, data.providers) : [];

  const sourceColumns: MatrxColumnDef<SourceRow>[] = [
    { id: "source", accessorFn: (r) => r.name, header: "Source", width: 200 },
    { id: "state", accessorFn: (r) => stateWords(r.ep.state).label, header: "State", width: 120, filter: "select", tone: (r) => stateWords(r.ep.state).tone },
    { id: "success7", accessorFn: (r) => successLabel(r.card7), sortValue: (r) => (r.card7?.samples ? r.card7.decided / r.card7.samples : -1), header: "Success, 7 days", width: 160 },
    { id: "success30", accessorFn: (r) => successLabel(r.card30), sortValue: (r) => (r.card30?.samples ? r.card30.decided / r.card30.samples : -1), header: "Success, 30 days", width: 160 },
    { id: "p50", accessorFn: (r) => speedLabel(r.card7?.p50_ms), sortValue: (r) => r.card7?.p50_ms ?? Number.MAX_SAFE_INTEGER, header: "Typical speed", width: 120 },
    { id: "p95", accessorFn: (r) => speedLabel(r.card7?.p95_ms), sortValue: (r) => r.card7?.p95_ms ?? Number.MAX_SAFE_INTEGER, header: "Slowest 5%", width: 120 },
    { id: "lastOk", accessorFn: (r) => ago(r.card30?.last_success_at), sortValue: (r) => (r.card30?.last_success_at ? new Date(r.card30.last_success_at).getTime() : 0), header: "Last worked", width: 130 },
    { id: "lastErr", accessorFn: (r) => ago(r.card30?.last_error_at), sortValue: (r) => (r.card30?.last_error_at ? new Date(r.card30.last_error_at).getTime() : 0), header: "Last failed", width: 130 },
    { id: "run", accessorFn: (r) => r.card7?.consecutive_unexpected ?? 0, header: "Errors in a row", width: 120, tone: (r) => ((r.card7?.consecutive_unexpected ?? 0) >= 3 ? "danger" : undefined) },
    { id: "checked", accessorFn: (r) => ago(r.ep.verified_at), sortValue: (r) => (r.ep.verified_at ? new Date(r.ep.verified_at).getTime() : 0), header: "Last check", width: 120 },
    { id: "strip", header: "Last 48 hours", width: 230, filter: false, sortable: false, cell: (r) => <UptimeStrip rows={r.strip} /> },
    {
      id: "actions",
      header: "",
      width: 280,
      filter: false,
      sortable: false,
      cell: (r) => {
        const state = r.ep.state;
        const working = busy?.endsWith(r.ep.id) ?? false;
        return (
          <div className="flex items-center gap-2">
            {state === "verifying" ? (
              <Button variant="outline" disabled={working} onClick={() => void cancel(r.ep)}>
                Cancel check
              </Button>
            ) : (
              <Button variant={state === "live" ? "outline" : "primary"} disabled={working} onClick={() => void verify(r.ep, r.name, state !== "live")}>
                {working && busy?.startsWith("verify") ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {state === "live" ? "Check" : "Check and turn on"}
              </Button>
            )}
            {state === "live" ? (
              <Button variant="outline" disabled={working} onClick={() => void turnOff(r.ep, r.name)}>
                Turn off
              </Button>
            ) : state !== "verifying" ? (
              <Button variant="outline" disabled={working} onClick={() => void turnOn(r.ep, r.name)}>
                Turn on
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const historyColumns: MatrxColumnDef<HistoryLine>[] = [
    { id: "when", accessorFn: (r) => r.at, cell: (r) => formatRelativeTime(r.at), header: "When", width: 140 },
    { id: "subject", accessorFn: (r) => r.subject, header: "What changed", width: 240, filter: "select" },
    { id: "line", accessorFn: (r) => r.line, header: "What happened", width: 520 },
  ];

  const paused = data?.entry.state === "paused";
  const toolWord = data ? stateWords(data.entry.state) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={TOOL_CONTROL_PATH} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" aria-label="All Tools">
          <ArrowLeft className="h-4 w-4" />
          Tools
        </Link>
        <h2 className="type-page-title">{data?.entry.display_name ?? "Tool"}</h2>
        {toolWord ? (
          <span className={toolWord.tone === "danger" ? "text-destructive" : toolWord.tone === "success" ? "text-success" : "text-muted-foreground"}>{toolWord.label}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {data ? (
            <Button
              variant="outline"
              disabled={busy !== null || data.entry.state === "draft" || data.entry.state === "retired"}
              onClick={() =>
                void run("pause", async () => {
                  if (!paused) {
                    const ok = await confirm({
                      title: `Pause ${data.entry.display_name}?`,
                      description: "Every agent, workflow and chat using it is told it is paused. It stays paused until you resume it.",
                      confirmLabel: "Pause",
                    });
                    if (!ok) return;
                  }
                  const result = await setToolPaused(toolId, !paused);
                  toast.success(result.message);
                })
              }
            >
              {paused ? "Resume" : "Pause"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh">
            {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-[3]">
        <MatrxDataTable
          data={sources}
          columns={sourceColumns}
          getRowId={(r) => r.ep.id}
          isLoading={loading}
          tableId="tool-control-sources"
          headerWrap="two-lines"
          read={readOf({ loading, error }, { what: "sources" })}
          emptyState={{ title: "No sources" }}
          toolbar={{ title: "Sources", search: true, searchPlaceholder: "Search sources…" }}
          copy={{
            label: "Source",
            listLabel: "Sources (this Tool)",
            location: `${TOOL_CONTROL_PATH}?tool=${toolId}`,
            rowKind: "tool-control-source",
            listKind: "tool-control-source",
            humanRow: (r) => `${r.name} · ${stateWords(r.ep.state).label} · ${successLabel(r.card7)}`,
            agentRow: (r) => ({ source: r.name, state: r.ep.state, card7: r.card7 ?? null, card30: r.card30 ?? null, last_probe: r.ep.last_probe }),
          }}
        />
      </div>
      <div className="min-h-0 flex-[2]">
        <MatrxDataTable
          data={history}
          columns={historyColumns}
          getRowId={(r) => `${r.at}:${r.subject}:${r.line}`}
          isLoading={loading}
          tableId="tool-control-history"
          read={readOf({ loading, error }, { what: "history" })}
          emptyState={{ title: "Nothing has changed yet" }}
          toolbar={{ title: "History", search: true, searchPlaceholder: "Search history…" }}
          copy={{
            label: "History line",
            listLabel: "History (this Tool)",
            location: `${TOOL_CONTROL_PATH}?tool=${toolId}`,
            rowKind: "tool-control-history",
            listKind: "tool-control-history",
            humanRow: (r) => `${r.at} · ${r.subject} · ${r.line}`,
            agentRow: (r) => ({ ...r }),
          }}
        />
      </div>
    </div>
  );
}
