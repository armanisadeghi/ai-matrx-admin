"use client";

/**
 * SandboxDiagnosticsPanel
 *
 * Total visibility into the sandbox's state. Three sections:
 *
 *   1. Readiness check — every layer reported with status code + latency:
 *        container ≫ matrx_agent (port 8000) ≫ aidream /api/health (8001)
 *        ≫ aidream /api/health/ready (8001 — exercises DB pools).
 *      Polls every 2s during boot, every 30s after `overall_ok=true`.
 *
 *   2. Env passthrough — names of every env var that landed inside the
 *      container (validates that critical vars like
 *      SUPABASE_AUTOMATION_MATRIX_DB_PASSWORD propagated). Names only —
 *      values never leave the orchestrator.
 *
 *   3. Live logs — text stream from inside the sandbox. User picks the
 *      source (docker / aidream / matrx_agent / entrypoint / autostart /
 *      all) and tail count; refreshes on a 3s timer plus a manual refresh
 *      button. Renders in a monospace block with line numbers.
 *
 * Used by:
 *   - The create-sandbox flow (CreateSandboxModal): stays open until the
 *     diagnostics report ``overall_ok: true``, then auto-closes (or shows
 *     a "looks good — connect now" CTA depending on ux).
 *   - The sandbox detail page: always-visible bottom panel so the user
 *     can see exactly what's happening at any time.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Loader2, RefreshCw, AlertCircle, Activity } from "lucide-react";

type DiagCheck = {
  ok?: boolean;
  status?: number;
  latency_ms?: number;
  body_preview?: string | null;
  error?: string;
  checked: boolean;
  reason?: string;
};

export type SandboxDiagnostics = {
  sandbox_id: string;
  overall_ok: boolean;
  sandbox: {
    status: string;
    tier: string;
    template: string | null;
    template_version: string | null;
    user_id: string;
    container_id: string | null;
    proxy_url: string | null;
    ssh_port: number | null;
    expires_at: string | null;
    last_heartbeat_at: string | null;
    persistence_volume: string | null;
    hot_path: string;
    cold_path: string;
  };
  container: {
    present: boolean;
    running?: boolean;
    status?: string;
    health?: string;
    started_at?: string;
    container_ip?: string;
    image?: string;
    passthrough_landed?: string[];
    passthrough_missing_count?: number;
    passthrough_missing_sample?: string[];
    error?: string;
  };
  checks: {
    matrx_agent_8000: DiagCheck;
    aidream_health_8001: DiagCheck;
    aidream_ready_8001: DiagCheck;
  };
};

const LOG_SOURCES = ["all", "aidream", "matrx_agent", "entrypoint", "autostart", "docker"] as const;
type LogSource = (typeof LOG_SOURCES)[number];

interface Props {
  /** Sandbox row UUID (NOT the sbx-XXX short id). */
  sandboxId: string;
  /** Show / hide the bottom log block. Defaults true. */
  showLogs?: boolean;
  /** Polling interval in seconds while the sandbox isn't yet healthy. */
  unhealthyPollSeconds?: number;
  /** Polling interval after overall_ok=true. */
  healthyPollSeconds?: number;
  /** Notify parent when overall_ok flips True. The create-sandbox flow uses
   *  this to flip "creating" → "ready" without polling Supabase. */
  onReady?: (diag: SandboxDiagnostics) => void;
}

export function SandboxDiagnosticsPanel({
  sandboxId,
  showLogs = true,
  unhealthyPollSeconds = 2,
  healthyPollSeconds = 30,
  onReady,
}: Props) {
  const [diag, setDiag] = useState<SandboxDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>("");
  const [logSource, setLogSource] = useState<LogSource>("aidream");
  const [logTail, setLogTail] = useState<number>(200);
  const [logsLoading, setLogsLoading] = useState(false);
  const onReadyFiredRef = useRef(false);

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/sandbox/${sandboxId}/diagnostics`, { cache: "no-store" });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`HTTP ${r.status}: ${body.slice(0, 300)}`);
      }
      const json = (await r.json()) as SandboxDiagnostics;
      setDiag(json);
      if (json.overall_ok && !onReadyFiredRef.current && onReady) {
        onReadyFiredRef.current = true;
        onReady(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sandboxId, onReady]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const r = await fetch(`/api/sandbox/${sandboxId}/logs?source=${logSource}&tail=${logTail}`, { cache: "no-store" });
      if (!r.ok) {
        setLogs(`(could not fetch logs: HTTP ${r.status})\n${await r.text()}`);
      } else {
        setLogs(await r.text());
      }
    } catch (e) {
      setLogs(`(error fetching logs: ${e instanceof Error ? e.message : String(e)})`);
    } finally {
      setLogsLoading(false);
    }
  }, [sandboxId, logSource, logTail]);

  // Poll diagnostics
  useEffect(() => {
    if (!sandboxId) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await fetchDiagnostics();
    };
    tick();
    const interval = setInterval(tick, (diag?.overall_ok ? healthyPollSeconds : unhealthyPollSeconds) * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sandboxId, diag?.overall_ok, fetchDiagnostics, healthyPollSeconds, unhealthyPollSeconds]);

  // Poll logs
  useEffect(() => {
    if (!sandboxId || !showLogs) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await fetchLogs();
    };
    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sandboxId, showLogs, fetchLogs, logSource, logTail]);

  if (error && !diag) {
    return (
      <div className="border border-destructive rounded-md p-3 text-sm">
        <div className="flex items-center gap-2 text-destructive font-medium">
          <AlertCircle className="h-4 w-4" />
          Diagnostics failed
        </div>
        <pre className="mt-2 text-xs whitespace-pre-wrap font-mono opacity-80">{error}</pre>
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Running diagnostics…
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Top status bar */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          {diag.overall_ok ? (
            <Badge variant="default" className="bg-success text-success-foreground gap-1">
              <CheckCircle2 className="h-3 w-3" /> Ready
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3 animate-pulse" /> Booting
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{diag.sandbox_id}</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDiagnostics} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Layer-by-layer checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <CheckCard label="Container" ok={!!diag.container.running} detail={`${diag.container.status ?? "?"} · ${diag.container.health ?? "?"} · ip ${diag.container.container_ip ?? "?"}`} />
        <CheckCard label="matrx_agent :8000" {...formatCheck(diag.checks.matrx_agent_8000)} />
        <CheckCard label="aidream :8001 (health)" {...formatCheck(diag.checks.aidream_health_8001)} />
        <CheckCard label="aidream :8001 (ready)" {...formatCheck(diag.checks.aidream_ready_8001)} colSpan="md:col-span-2" />
        <CheckCard
          label="Env passthrough"
          ok={(diag.container.passthrough_landed?.length ?? 0) > 50}
          detail={
            diag.container.passthrough_landed
              ? `${diag.container.passthrough_landed.length} landed · ${diag.container.passthrough_missing_count ?? 0} missing`
              : "no data"
          }
        />
      </div>

      <Tabs defaultValue="raw" className="w-full">
        <TabsList>
          <TabsTrigger value="raw">Raw response</TabsTrigger>
          <TabsTrigger value="env">Env vars</TabsTrigger>
          {showLogs && <TabsTrigger value="logs">Live logs</TabsTrigger>}
        </TabsList>

        <TabsContent value="raw" className="mt-2">
          <ScrollArea className="h-72 border border-border rounded-md">
            <pre className="text-xs font-mono p-3 whitespace-pre-wrap">{JSON.stringify(diag, null, 2)}</pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="env" className="mt-2">
          <div className="text-xs space-y-2">
            <div>
              <strong>{diag.container.passthrough_landed?.length ?? 0}</strong> env vars landed inside the container:
            </div>
            <ScrollArea className="h-60 border border-border rounded-md">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-2 font-mono">
                {(diag.container.passthrough_landed ?? []).map((k) => (
                  <span key={k} className="text-success">✓ {k}</span>
                ))}
                {(diag.container.passthrough_missing_sample ?? []).map((k) => (
                  <span key={k} className="text-muted-foreground">— {k}</span>
                ))}
              </div>
            </ScrollArea>
            {(diag.container.passthrough_missing_count ?? 0) > 0 && (
              <div className="text-xs text-muted-foreground">
                {diag.container.passthrough_missing_count} more not set on the orchestrator (see{" "}
                <code className="text-xs">missing_keys</code> in the orchestrator's <code>/integrations</code>).
              </div>
            )}
          </div>
        </TabsContent>

        {showLogs && (
          <TabsContent value="logs" className="mt-2">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={logSource}
                onChange={(e) => setLogSource(e.target.value as LogSource)}
                className="text-xs border border-border rounded-md px-2 py-1 bg-background"
              >
                {LOG_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={logTail}
                onChange={(e) => setLogTail(Number(e.target.value))}
                className="text-xs border border-border rounded-md px-2 py-1 bg-background"
              >
                {[100, 200, 500, 1000, 2000].map((n) => (
                  <option key={n} value={n}>tail {n}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${logsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <span className="text-xs text-muted-foreground">auto-refreshes every 3s</span>
            </div>
            <ScrollArea className="h-96 border border-border rounded-md">
              <pre className="text-[11px] font-mono p-3 whitespace-pre-wrap leading-tight">{logs || "(empty)"}</pre>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function formatCheck(c: DiagCheck): { ok: boolean; detail: string } {
  if (!c.checked) return { ok: false, detail: c.reason ?? "not checked" };
  if (c.error) return { ok: false, detail: `${c.error} · ${c.latency_ms ?? "?"}ms` };
  const okFlag = c.ok ?? false;
  return { ok: okFlag, detail: `HTTP ${c.status ?? "?"} · ${c.latency_ms ?? "?"}ms` };
}

function CheckCard({
  label,
  ok,
  detail,
  colSpan,
}: {
  label: string;
  ok: boolean;
  detail: string;
  colSpan?: string;
}) {
  return (
    <div className={`border border-border rounded-md p-2 ${colSpan ?? ""}`}>
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 font-mono break-all">{detail}</div>
    </div>
  );
}
