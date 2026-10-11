"use client";

// Billing › Alarms: every spend alarm record, ringing ones first, on the canonical MatrxDataTable
// (views, KPIs, tones). Each row opens its record page; ?id=<alarm> highlights that row.

import { useEffect, useState } from "react";
import Link from "next/link";
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
  alarmHeadline,
  costLabel,
  fixFor,
  refHref,
  fetchSpendAlarms,
  isRinging,
  spendAlarmHref,
  type SpendAlarmRecord,
} from "./spendAlarms";

type StatusFilter = "ringing" | "snoozed" | "resolved" | "all";

/** Whose alarm it is, as a person or a service: never a raw id. */
function whose(r: SpendAlarmRecord): string {
  if (r.subject_name) return r.subject_name;
  if (r.refs.provider) return `${r.refs.provider}${r.refs.operation ? ` ${r.refs.operation}` : ""}`;
  if (r.refs.mandate_key) return r.refs.mandate_key;
  return r.subject_type.replace(/_/g, " ");
}

const LEVEL_RANK = { critical: 0, warning: 1, info: 2 } as const;

export function SpendAlarmsBoard() {
  const [rows, setRows] = useState<SpendAlarmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const { prefs: viewPrefs, setPrefs: setViewPrefs } = useListViewPrefs("spend-alarms-admin");
  const params = useSearchParams();
  const focusId = params.get("id");
  const router = useRouter();
  // ?kind=<kind> narrows the list to one kind (the record page's "Open the skipped Sources").
  const kindFilter = params.get("kind");
  const [status, setStatusState] = useState<StatusFilter>(kindFilter ? "all" : "ringing");
  const setStatus = (v: StatusFilter) => setStatusState(v);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchSpendAlarms()
      .then((r) => alive && (setRows(r), setError(null)))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [version]);

  const visible = rows
    .filter((r) => !kindFilter || r.kind === kindFilter)
    .filter((r) =>
      status === "all" ? true : status === "ringing" ? isRinging(r) : status === "snoozed" ? r.status === "snoozed" && !isRinging(r) : r.status === "resolved",
    )
    .sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || b.last_seen_at.localeCompare(a.last_seen_at));

  const columns: MatrxColumnDef<SpendAlarmRecord>[] = [
    {
      id: "level",
      accessorKey: "level",
      header: "Level",
      filter: "select",
      tone: (r) => (r.level === "critical" ? "danger" : r.level === "warning" ? "warning" : "muted"),
      sortValue: (r) => LEVEL_RANK[r.level],
      cell: (r) => LEVEL_LABEL[r.level],
      kpi: [
        { op: "count", id: "critical", label: "Critical", countWhere: (r) => r.level === "critical", tone: (v) => (v > 0 ? "danger" : undefined) },
        { op: "count", id: "warning", label: "To decide", countWhere: (r) => r.level === "warning", tone: (v) => (v > 0 ? "warning" : undefined) },
      ],
    },
    {
      id: "title",
      accessorFn: (r) => alarmHeadline(r.title, r.subject_id, r.subject_name),
      header: "Alarm",
      href: (r) => spendAlarmHref(r.id),
      width: 420,
      cell: (r) => (
        <Link href={spendAlarmHref(r.id)} className="line-clamp-2 whitespace-normal text-primary hover:underline">
          {alarmHeadline(r.title, r.subject_id, r.subject_name)}
        </Link>
      ),
    },
    {
      id: "subject",
      header: "Whose",
      width: 240,
      accessorFn: (r) => whose(r),
      cell: (r) =>
        r.refs.user_id ? (
          <Link href={refHref("user_id", r.refs.user_id) ?? "#"} className="line-clamp-2 whitespace-normal text-primary hover:underline">
            {whose(r)}
          </Link>
        ) : (
          <span className="line-clamp-2 whitespace-normal">{whose(r)}</span>
        ),
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
      width: 150,
      accessorFn: (r) => costLabel(r, formatAdminUsd),
      sortValue: (r) => r.cost_usd ?? 0,
      kpi: { op: "count", id: "refused", label: "Refused before spending", countWhere: (r) => r.refused && r.cost_usd == null },
    },
    {
      id: "fix",
      header: "What to do",
      width: 260,
      accessorFn: (r) => (fixFor(r) ? `Fixed in code ${fixFor(r)!.on}; resolve it` : r.fix ?? ""),
      cell: (r) => <span className="line-clamp-2 whitespace-normal">{fixFor(r) ? "Fixed in code; resolve it" : r.fix ?? ""}</span>,
    },
    { id: "last_seen_at", accessorKey: "last_seen_at", header: "Last seen", cell: (r) => new Date(r.last_seen_at).toLocaleString() },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      filter: "select",
      tone: (r) => (r.status === "resolved" ? "success" : r.status === "snoozed" ? "muted" : undefined),
    },
    { id: "handler", header: "Handler", accessorFn: (r) => r.refs.handler ?? "" },
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
                    { value: "ringing", label: "Open" },
                    { value: "snoozed", label: "Snoozed" },
                    { value: "resolved", label: "Resolved" },
                    { value: "all", label: "All" },
                  ]}
                />
                <Button variant="outline" onClick={() => setVersion((v) => v + 1)} disabled={loading} aria-label="Refresh">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
            humanRow: (r) => `${r.level} · ${r.title} · x${r.occurrence_count} · ${spendAlarmHref(r.id)}`,
            agentRow: (r) => ({ ...r, page: spendAlarmHref(r.id) }),
          }}
        />
      </div>
    </div>
  );
}
