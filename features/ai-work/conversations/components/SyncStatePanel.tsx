"use client";

// features/ai-work/conversations/components/SyncStatePanel.tsx
//
// "Is my Claude Code history actually arriving?" — answered, per account, from
// facts that were already in the database and that nothing rendered.
//
// TWO components, ONE reader (`readSyncState`):
//   <SyncStatePanel />     the full per-account breakdown on /work/connections
//   <SyncStateIndicator /> the compact strip above /work/conversations
// A user must never be able to open both and see different verdicts.
//
// THE SYNC-NOW DOOR — re-verified 2026-08-19, stated exactly:
// Matrx Local really does own the historical import (`/coding-session/claude/
// history/{preview,import,status}` in matrx-local), and the web app still
// cannot invoke it — but NOT for the reason this comment used to give. The
// "a browser cannot discover a locally scanned port / the aidream relay only
// addresses /sandbox" rationale predates the per-user Broadcast bridge
// (`matrx-local-bridge:<userId>`), which the composer and the Continue panel
// use to reach this very desktop app today. The REAL and only remaining
// reason: matrx-local registers `coding_runtime.{capabilities,resumable,
// start,status,cancel}` on that channel and NOTHING for history — there is no
// `coding_history.*` handler to call. Building those handlers is the open
// work (handoff item 7); until then the door stays honest.
// So the button says that and opens the desktop app's own page. A button that
// looks live and does nothing is the "fake Resume" this product forbids.

import { Fact } from "@/features/ai-work/components/connections/Fact";
import { StatusDot } from "@ai-matrx/design-system";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatSessionTimestamp } from "@/features/agent-connections/coding-sessions/verdict";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { arrivedByLabel } from "@/features/ai-work/lib/matrx2Coding";
import { providerLabel } from "../presentation";
import {
  EMPTY_SYNC_STATE,
  freshnessLabel,
  readSyncState,
  type SyncAccountState,
  type SyncFreshness,
  type SyncStateSnapshot,
} from "../syncState";
import { MATRX_LOCAL_DOWNLOAD_PATH } from "@/features/matrx-local-download/release";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/** Exact, verified statement of why the web app cannot start a sync itself. */
export const SYNC_NOW_UNAVAILABLE_REASON =
  "Historical Claude Code sync runs inside the Matrx Local desktop app. AI Matrx can reach " +
  "that app (it is how a run starts on your Mac), but the desktop only answers agent-runtime " +
  "requests over that link — it exposes nothing for history import yet, so there is no " +
  "sync to start from here. Open Matrx Local → Claude History to run it.";

function useSyncState() {
  const [state, setState] = useState<SyncStateSnapshot>(EMPTY_SYNC_STATE);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void readSyncState()
      .then((next) => {
        if (cancelled) return;
        setState(next);
        setStatus("ready");
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Loud recovery: an empty panel must never read as "you have no
        // sessions" when the read itself failed.
        setState(EMPTY_SYNC_STATE);
        setError(err instanceof Error ? err.message : "Sync state read failed");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return {
    state,
    status,
    error,
    reload: () => {
      setStatus("loading");
      setReloadToken((n) => n + 1);
    },
  };
}

function FreshnessPill({ freshness }: { freshness: SyncFreshness }) {
  const Icon =
    freshness === "live"
      ? CheckCircle2
      : freshness === "recent"
        ? Clock
        : AlertTriangle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        freshness === "live" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        freshness === "recent" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        (freshness === "stale" || freshness === "none") &&
          "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {freshnessLabel(freshness)}
    </span>
  );
}

/**
 * The one honest "Sync now". It never pretends: it states the boundary and
 * opens the surface that CAN do it.
 */
export function SyncNowDoor({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}
    >
      <Button asChild variant="outline">
        <OutboundLink
          href={MATRX_LOCAL_DOWNLOAD_PATH}
        >
          <Download className="h-3.5 w-3.5" />
          Sync now in Matrx Local
          <ExternalLink className="h-3.5 w-3.5" />
        </OutboundLink>
      </Button>
      {!compact && (
        <p className="flex-1 basis-full text-xs leading-relaxed text-muted-foreground">
          <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
          {SYNC_NOW_UNAVAILABLE_REASON}
        </p>
      )}
    </div>
  );
}

/**
 * The full breakdown on /work/connections: one row per provider account in the canonical table
 * (every column sorts and filters); fidelity, arrival and workspaces are in the row's details.
 */
export function SyncStatePanel() {
  const { state, status, error, reload } = useSyncState();
  const columns: MatrxColumnDef<SyncAccountState>[] = [
    { id: "app", header: "App", accessorFn: (a) => providerLabel(a.provider) ?? humanizeIdentifier(a.provider), filter: "select", width: 130 },
    { id: "account", header: "Account", accessorFn: (a) => a.accountLabel, filter: "text", width: 240, cell: (a) => <span className={cn("truncate", !a.accountReported && "text-muted-foreground")} title={a.accountLabel}>{a.accountLabel}</span> },
    {
      id: "status",
      header: "Status",
      accessorFn: (a) => freshnessLabel(a.freshness),
      sortValue: (a) => FRESHNESS_ORDER[a.freshness],
      filter: "select",
      width: 190,
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <StatusDot tone={FRESHNESS_TONE[a.freshness]} label={freshnessLabel(a.freshness)} />
          <span className="truncate">{freshnessLabel(a.freshness)}</span>
        </span>
      ),
    },
    { id: "sessions", header: "Sessions", accessorFn: (a) => a.sessionCount, filter: "number", width: 100, align: "right" },
    { id: "last_delivery", header: "Last delivery", accessorFn: (a) => a.lastSeenAt, filter: "date", width: 190, cell: (a) => <span className="text-muted-foreground">{a.lastSeenAt ? formatSessionTimestamp(a.lastSeenAt) : "Never"}</span> },
    { id: "inactive", header: "Not active", accessorFn: (a) => a.inactiveCount, filter: "number", width: 100, align: "right", helpText: "Sessions whose delivery binding is no longer active" },
    { id: "workspaces", header: "Workspaces", accessorFn: (a) => a.workspaces.length, filter: "number", width: 110, align: "right" },
  ];
  return (
    <MatrxDataTable<SyncAccountState>
      tableId="work/connections/synced"
      data={state.accounts}
      columns={columns}
      getRowId={(a) => a.key}
      pageSize={0}
      density="condensed"
      viewTabs={false}
      selection={false}
      defaultSort={{ id: "last_delivery", direction: "desc" }}
      toolbar={{ title: "Synced to AI Matrx", searchPlaceholder: "Search synced accounts", refresh: { onRefresh: reload, label: "Read sync state again" } }}
      rowActions={(a, controls) => [{ id: "info", icon: Info, label: `Everything about ${a.accountLabel}`, onClick: controls.openDetail }]}
      detail={{
        title: (a) => a.accountLabel,
        description: (a) => providerLabel(a.provider) ?? humanizeIdentifier(a.provider),
        render: (a) => (
          <div className="space-y-3 p-1">
            <Fact label="App" value={providerLabel(a.provider) ?? humanizeIdentifier(a.provider)} />
            <Fact label="Account" value={a.accountReported ? a.accountLabel : null} empty="No identity reported" />
            <Fact label="Status" value={freshnessLabel(a.freshness)} />
            <Fact label="Sessions delivered" value={a.sessionCount.toLocaleString()} />
            <Fact label="Last delivery" value={a.lastSeenAt ? formatSessionTimestamp(a.lastSeenAt) : "Never"} />
            <Fact label="Fidelity" value={a.fidelity.map((f) => `${humanizeIdentifier(f.value)} (${f.count})`).join(", ") || null} empty="None recorded" />
            <Fact label="Arrived by" value={a.origin.map((o) => `${arrivedByLabel(o.value, humanizeIdentifier)} (${o.count})`).join(", ") || null} empty="None recorded" />
            <Fact label="Bindings not active" value={a.inactiveCount > 0 ? String(a.inactiveCount) : "None"} />
            <Fact label="Workspaces" value={a.workspaces.length ? a.workspaces.join(", ") : null} empty="None reported" />
          </div>
        ),
      }}
      isLoading={status === "loading"}
      read={{ status, error: error ?? undefined, onRetry: reload, what: "your delivered coding sessions" }}
      emptyState={{ title: "Nothing synced yet", description: "Install the AI Matrx plugin in Claude Code" }}
    />
  );
}

const FRESHNESS_ORDER: Record<SyncFreshness, number> = { live: 0, recent: 1, stale: 2, none: 3 };
const FRESHNESS_TONE: Record<SyncFreshness, "success" | "warning" | "neutral"> = { live: "success", recent: "warning", stale: "neutral", none: "neutral" };

/**
 * The compact form for the conversations list — same reader, same verdict, one
 * line. It is a door, not a decoration: the whole strip links to the full
 * panel.
 */
export function SyncStateIndicator() {
  const { state, status, error } = useSyncState();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs">
      <span className="font-medium text-foreground">Claude Code sync</span>
      {status === "loading" ? (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking…
        </span>
      ) : status === "error" ? (
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertTriangle className="h-3 w-3" />
          {error}
          <ErrorAlchemyMenu error={error} />
        </span>
      ) : (
        <>
          <FreshnessPill freshness={state.freshness} />
          <span className="text-muted-foreground">
            {state.totalSessions.toLocaleString()} session
            {state.totalSessions === 1 ? "" : "s"} · {state.accounts.length}{" "}
            account
            {state.accounts.length === 1 ? "" : "s"} ·{" "}
            {state.lastSeenAt
              ? `last delivery ${formatSessionTimestamp(state.lastSeenAt)}`
              : "never delivered"}
          </span>
        </>
      )}
      <a
        href="/work/connections"
        className="ml-auto font-medium text-primary hover:underline"
      >
        Sync state and Sync now
      </a>
    </div>
  );
}
