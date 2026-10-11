"use client";

// Billing › Alarms: every spend alarm record, ringing ones first, on the canonical MatrxDataTable
// (views, KPIs, tones). Each row opens its record page; ?id=<alarm> highlights that row.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { useListViewPrefs } from "@/lib/list-views/useListViewPrefs";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import {
  LEVEL_LABEL,
  SPEND_ALARMS_PATH,
  alarmTitle,
  costLabel,
  spendAlarmCounts,
  fixFor,
  refHref,
  whose,
  fetchSpendAlarms,
  isRinging,
  spendAlarmHref,
  type SpendAlarmAttentionRow as SpendAlarmRecord,
} from "./spendAlarms";

type StatusFilter = "ringing" | "snoozed" | "resolved" | "all";

const LEVEL_RANK = { critical: 0, warning: 1, info: 2 } as const;

export function SpendAlarmsBoard() {
  // Under the dock's query prefix: a mute anywhere (dock, record page) refreshes this list at once.
  const query = useQuery({ queryKey: ["admin-attention", "spend-alarm-list"], queryFn: fetchSpendAlarms, refetchOnWindowFocus: true });
  const rows: SpendAlarmRecord[] = query.data ?? [];
  const loading = query.isFetching && !query.data;
  const error = query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null;
  const { prefs: viewPrefs, setPrefs: setViewPrefs } = useListViewPrefs("spend-alarms-admin");
  const params = useSearchParams();
  const focusId = params.get("id");
  const router = useRouter();
  // ?kind=<kind> narrows the list to one kind (the record page's "Open the skipped Sources").
  const kindFilter = params.get("kind");
  const [status, setStatus] = useState<StatusFilter>("ringing");



  const visible = rows
    .filter((r) => !kindFilter || r.kind === kindFilter)
    .filter((r) =>
      status === "all" ? true : status === "ringing" ? isRinging(r) : status === "snoozed" ? r.status === "snoozed" && !isRinging(r) : r.status === "resolved",
    )
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.last_seen_at.localeCompare(a.last_seen_at));

  // Every row read (never a capped page): the tab labels carry the same counts the dock shows.
  const counts = spendAlarmCounts(rows.filter((r) => !kindFilter || r.kind === kindFilter));
  const ringing = counts.critical + counts.warning + counts.info;
  const resolvedCount = rows.filter((r) => r.status === "resolved" && (!kindFilter || r.kind === kindFilter)).length;

  const columns: MatrxColumnDef<SpendAlarmRecord>[] = [
    {
      id: "level",
      accessorKey: "level",
      header: "Level",
      filter: "select",
      tone: (r) => (r.level === "critical" ? "danger" : r.level === "warning" ? "warning" : "muted"),
      sortValue: (r) => LEVEL_RANK[r.level],
      cell: (r) => LEVEL_LABEL[r.level],
      // The SAME rule the attention dock counts by (spendAlarmCounts: ringing, by effective level), over every row read.
      kpi: [
        { op: "count", id: "critical", label: "Critical", countWhere: (r) => r.level === "critical" && isRinging(r), tone: (v) => (v > 0 ? "danger" : undefined) },
        { op: "count", id: "warning", label: "To decide", countWhere: (r) => r.level === "warning" && isRinging(r), tone: (v) => (v > 0 ? "warning" : undefined) },
      ],
    },
    {
      id: "title",
      accessorFn: (r) => alarmTitle(r),
      header: "Alarm",
      href: (r) => spendAlarmHref(r.id),
      width: 420,
      // The column's href makes the cell the link; a Link inside it would nest <a> in <a>.
    },
    {
      id: "subject",
      header: "Whose",
      width: 240,
      accessorFn: (r) => whose(r),
      href: (r) => (r.refs.user_id && !r.subject_type.startsWith("source") ? refHref("user_id", r.refs.user_id) ?? undefined : undefined),
    },
    {
      id: "occurrence_count",
      accessorKey: "occurrence_count",
      header: "Count",
      width: 90,
      tone: (r) => (r.occurrence_count >= 100 ? "danger" : undefined),
      kpi: { op: "sum", label: "Occurrences" },
    },
    {
      id: "cost",
      header: "Cost",
      width: 130,
      accessorFn: (r) => costLabel(r, formatAdminUsd),
      sortValue: (r) => r.cost_usd ?? 0,
      kpi: { op: "count", id: "refused", label: "Refused before spending", countWhere: (r) => r.refused && r.cost_usd == null },
    },
    {
      id: "fix",
      header: "What to do",
      width: 260,
      accessorFn: (r) => (r.watching ? "Fixed, watching" : fixFor(r) ? "Fixed in code; resolve it" : r.fix ?? ""),

    },
    { id: "last_seen_at", accessorKey: "last_seen_at", header: "Last seen", cell: (r) => new Date(r.last_seen_at).toLocaleString() },
    {
      id: "status",
      header: "Status",
      width: 260,
      filter: "select",
      tone: (r) => (r.status === "resolved" ? "success" : r.status === "snoozed" ? "muted" : undefined),
      accessorFn: (r) =>
        r.status === "snoozed" && !isRinging(r)
          ? `Muted until ${new Date(r.snoozed_until as string).toLocaleString()}${r.snoozed_by ? ` by ${r.snoozed_by}` : ""}${r.snooze_note ? `: ${r.snooze_note}` : ""}`
          : r.status === "resolved"
            ? "Resolved"
            : r.watching
              ? "Fixed, watching"
              : "Open",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <ErrorAlchemyMenu error={error} />
        </div>
      ) : null}
      {kindFilter ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing</span>
          <span className="font-medium">{kindFilter.replace(/[._]/g, " ")}</span>
          <Button variant="quiet" onClick={() => router.push(SPEND_ALARMS_PATH)} aria-label="Show all alarms" title="Show all alarms">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={visible}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={loading}
          tableId="spend-alarms-admin"
          viewTabsStore={{ views: viewPrefs.savedViews ?? [], onChange: (savedViews) => setViewPrefs({ savedViews }) }}
          focusRowId={focusId}
          headerWrap="two-lines"
          // A phone reads each alarm as a card: title, level, whose, count, cost.
          mobileCardsBreakpoint="sm"
          mobileCards={(r) => (
            <Link href={spendAlarmHref(r.id)} className="flex flex-col gap-0.5 px-3 py-2" data-testid="spend-alarm-card">
              <span className="line-clamp-2 text-sm font-medium text-foreground">{alarmTitle(r)}</span>
              <span className="text-xs text-muted-foreground">
                <span className={r.level === "critical" ? "text-destructive" : r.level === "warning" ? "text-warning" : undefined}>{r.watching ? "Fixed, watching" : LEVEL_LABEL[r.level]}</span>
                {` · ${whose(r)} · ${r.occurrence_count.toLocaleString()}× · ${costLabel(r, formatAdminUsd)}`}
              </span>
            </Link>
          )}
          cellLines="two"
          read={readOf({ loading, error }, { what: "spend alarms" })}
          emptyState={{ title: status === "ringing" ? "No alarms ringing" : "No alarms" }}
          toolbar={{
            title: "Spend alarms",
            search: true,
            searchPlaceholder: "Search alarms, kinds, subjects…",
            actions: (
              <div className="flex items-center gap-2">
                <SegmentedControl<StatusFilter>
                  aria-label="Status"
                  value={status}
                  onValueChange={setStatus}
                  data={[
                    { value: "ringing", label: `Open ${ringing}` },
                    { value: "snoozed", label: `Muted ${counts.snoozed}` },
                    { value: "resolved", label: `Resolved ${resolvedCount}` },
                    { value: "all", label: "All" },
                  ]}
                />
                <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh">
                  {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            ),
          }}
          copy={{
            label: "Spend alarm",
            listLabel: "Spend alarms (this view)",
            location: SPEND_ALARMS_PATH,
            rowKind: "spend-alarm",
            listKind: "spend-alarm",
            humanRow: (r) => `${r.level} · ${alarmTitle(r)} · x${r.occurrence_count} · ${spendAlarmHref(r.id)}`,
            agentRow: (r) => ({ ...r, page: spendAlarmHref(r.id) }),
          }}
        />
      </div>
    </div>
  );
}
