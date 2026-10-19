"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { useListViewPrefs } from "@/lib/list-views/useListViewPrefs";
import { formatRelativeTime } from "@/utils/datetime";
import { WATCHTOWER_PATH, WATCHTOWER_QUERY_KEY } from "./paths";
import { loadRuns, loadSnapshot } from "./service";
import type { CanaryRunRow, ScorecardRow } from "./types";
import { alarmWords, dailyNote, outcomeWords, percent, seconds, sortScorecards } from "./words";

const ago = (iso: string | null) => (iso ? formatRelativeTime(iso) : "Never");
const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const columns: MatrxColumnDef<ScorecardRow>[] = [
  { id: "feature", accessorFn: (r) => r.label, header: "Feature", width: 280, href: (r) => `${WATCHTOWER_PATH}?feature=${encodeURIComponent(r.feature_key)}` },
  { id: "group", accessorFn: (r) => r.group_key, header: "Area", width: 90, filter: "select" },
  { id: "alarm", accessorFn: (r) => alarmWords(r.alarm_state).label, header: "Alarm", width: 110, filter: "select", tone: (r) => alarmWords(r.alarm_state).tone },
  { id: "last", accessorFn: (r) => ago(r.last_canary_at), sortValue: (r) => time(r.last_canary_at), header: "Last canary", width: 120 },
  { id: "outcome", accessorFn: (r) => outcomeWords(r.last_outcome).label, header: "Result", width: 90, tone: (r) => outcomeWords(r.last_outcome).tone },
  { id: "success", accessorFn: (r) => percent(r.success_rate), sortValue: (r) => r.success_rate ?? -1, header: "Success, 7 days", width: 120 },
  { id: "p50", accessorFn: (r) => seconds(r.p50_seconds), sortValue: (r) => r.p50_seconds ?? Number.MAX_SAFE_INTEGER, header: "Typical", width: 90 },
  { id: "p90", accessorFn: (r) => seconds(r.p90_seconds), sortValue: (r) => r.p90_seconds ?? Number.MAX_SAFE_INTEGER, header: "Slow 1 in 10", width: 110 },
  { id: "cost", accessorFn: (r) => (r.avg_points === null ? "n/a" : `${Math.round(r.avg_points)} pts`), sortValue: (r) => r.avg_points ?? 0, header: "Cost per call", width: 110 },
  { id: "misses", accessorFn: (r) => r.shape_misses, header: "Shape misses", width: 110 },
  { id: "ok", accessorFn: (r) => ago(r.last_success_at), sortValue: (r) => time(r.last_success_at), header: "Last success", width: 120 },
];

const runColumns: MatrxColumnDef<CanaryRunRow>[] = [
  { id: "when", accessorFn: (r) => ago(r.ran_at), sortValue: (r) => time(r.ran_at), header: "When", width: 110 },
  { id: "outcome", accessorFn: (r) => outcomeWords(r.outcome).label, header: "Result", width: 90, filter: "select", tone: (r) => outcomeWords(r.outcome).tone },
  { id: "seconds", accessorFn: (r) => seconds(r.seconds), sortValue: (r) => r.seconds ?? -1, header: "Seconds", width: 90 },
  { id: "points", accessorFn: (r) => r.points, header: "Points", width: 80 },
  { id: "sanity", accessorFn: (r) => r.sanity, header: "Answer check", width: 120, filter: "select" },
  { id: "subject", accessorFn: (r) => r.subject_label ?? "", header: "Subject", width: 220 },
  { id: "edge", accessorFn: (r) => r.edge_case ?? "", header: "Edge case", width: 220, filter: "select" },
  { id: "route", accessorFn: (r) => `${r.method} ${r.route}`, header: "Route", width: 140 },
  { id: "error", accessorFn: (r) => r.error_text ?? "", header: "Error", width: 420 },
];

export function WatchtowerPage() {
  const feature = useSearchParams()?.get("feature") ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col px-[var(--matrx-page-gutter)] pt-[var(--matrx-page-top)] pb-[var(--matrx-page-end)]">
      {feature ? <FeatureRuns featureKey={feature} /> : <Overview />}
    </div>
  );
}

function RefreshButton({ fetching, onClick }: { fetching: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} disabled={fetching} aria-label="Refresh">
      {fetching ? <Spinner size="xs" /> : <RefreshCw className="h-4 w-4" />}
    </Button>
  );
}

function Overview() {
  const query = useQuery({ queryKey: [...WATCHTOWER_QUERY_KEY, "snapshot"], queryFn: loadSnapshot, refetchOnWindowFocus: true });
  const { prefs, setPrefs } = useListViewPrefs("watchtower-features");
  const rows = sortScorecards(query.data?.scorecards ?? []);
  const note = dailyNote(query.data?.scorecards ?? []);
  const loading = query.isFetching && !query.data;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {note ? <p className="text-sm text-foreground">{note}</p> : null}
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={rows}
          columns={columns}
          getRowId={(r) => r.feature_key}
          isLoading={loading}
          tableId="watchtower-features"
          viewTabsStore={{ views: prefs.savedViews ?? [], onChange: (savedViews) => setPrefs({ savedViews }) }}
          headerWrap="two-lines"
          read={readOf({ loading, error }, { what: "Watchtower" })}
          emptyState={{ title: "No canary has run yet" }}
          toolbar={{
            title: "Watchtower",
            search: true,
            searchPlaceholder: "Search features…",
            actions: <RefreshButton fetching={query.isFetching} onClick={() => void query.refetch()} />,
          }}
          copy={{
            label: "Feature",
            listLabel: "Features (this view)",
            location: WATCHTOWER_PATH,
            rowKind: "watchtower-feature",
            listKind: "watchtower-feature",
            humanRow: (r) => `${r.label} · ${alarmWords(r.alarm_state).label} · success ${percent(r.success_rate)} · typical ${seconds(r.p50_seconds)}`,
            agentRow: (r) => ({ ...r, page: `${WATCHTOWER_PATH}?feature=${r.feature_key}` }),
          }}
        />
      </div>
    </div>
  );
}

function FeatureRuns({ featureKey }: { featureKey: string }) {
  const router = useRouter();
  const query = useQuery({ queryKey: [...WATCHTOWER_QUERY_KEY, "runs", featureKey], queryFn: () => loadRuns(featureKey), refetchOnWindowFocus: true });
  const rows = query.data ?? [];
  const loading = query.isFetching && !query.data;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;
  return (
    <div className="min-h-0 flex-1">
      <MatrxDataTable
        data={rows}
        columns={runColumns}
        getRowId={(r) => r.id}
        isLoading={loading}
        tableId="watchtower-runs"
        headerWrap="two-lines"
        read={readOf({ loading, error }, { what: "Canary runs" })}
        emptyState={{ title: "No canary runs for this feature" }}
        toolbar={{
          title: featureKey,
          search: true,
          searchPlaceholder: "Search runs…",
          actions: (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push(WATCHTOWER_PATH)}>
                All features
              </Button>
              <RefreshButton fetching={query.isFetching} onClick={() => void query.refetch()} />
            </div>
          ),
        }}
        copy={{
          label: "Run",
          listLabel: "Runs (this view)",
          location: `${WATCHTOWER_PATH}?feature=${featureKey}`,
          rowKind: "watchtower-run",
          listKind: "watchtower-run",
          humanRow: (r) => `${featureKey} · ${outcomeWords(r.outcome).label} · ${seconds(r.seconds)} · ${r.points} points${r.error_text ? ` · ${r.error_text}` : ""}`,
          agentRow: (r) => ({ ...r, page: `${WATCHTOWER_PATH}?feature=${featureKey}` }),
        }}
      />
    </div>
  );
}
