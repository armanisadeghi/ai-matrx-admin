"use client";

// Billing › Build waste: every package build in the window on the canonical MatrxDataTable, with the shared
// drill-down answering why builds are wasted (reason), who causes it (dispatcher), when, and which package.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef, MatrxDataTableLocalDrillConfig } from "@ai-matrx/design-system/data-table";
import { readOf } from "@ai-matrx/design-system";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { fetchBuilds, toCells, type BuildCell } from "./buildWaste";

const WINDOWS = [
  { value: "1", label: "24h" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);
const min = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("en-US"));

const COLUMNS: MatrxColumnDef<BuildCell>[] = [
  { id: "package", accessorKey: "package", header: "Package", width: 240, filter: "select" },
  { id: "ecosystem", accessorKey: "ecosystem", header: "Kind", width: 90, filter: "select" },
  { id: "dispatcher", accessorKey: "dispatcher", header: "Dispatcher", width: 180, filter: "select" },
  { id: "trigger", accessorKey: "trigger", header: "Trigger", width: 130, filter: "select" },
  { id: "reason", accessorKey: "reason", header: "Reason", width: 260, filter: "select" },
  { id: "outcome", accessorKey: "outcome", header: "Outcome", width: 110, filter: "select" },
  { id: "builtAt", accessorKey: "builtAt", header: "Built", width: 160, filter: "date", format: { id: "datetime" } },
  {
    id: "minutes",
    accessorKey: "minutes",
    header: "Minutes",
    width: 90,
    align: "right",
    kpi: [{ op: "count", id: "builds", label: "Builds", countWhere: () => true }],
  },
  {
    id: "noopMinutes",
    accessorKey: "noopMinutes",
    header: "No-op min",
    width: 100,
    align: "right",
    kpi: [{ op: "sum", id: "noopMinutes", label: "No-op min" }],
  },
  {
    id: "noopUsd",
    accessorKey: "noopUsd",
    header: "No-op $",
    width: 100,
    align: "right",
    cell: (r) => formatAdminUsd(r.noopUsd),
    kpi: [{ op: "sum", id: "noopUsd", label: "No-op $" }],
  },
  {
    id: "noopPct",
    accessorKey: "noopPct",
    header: "No-op %",
    width: 90,
    align: "right",
    format: { id: "percent", options: { precision: 0 } },
    kpi: [{ op: "avg", id: "noopPct", label: "No-op %", tone: (v) => (v > 50 ? "danger" : v > 30 ? "warning" : undefined) }],
  },
];

const SHOW = ["count", "avg_noopPct", "sum_noopMinutes", "sum_noopUsd"];

const DRILL: MatrxDataTableLocalDrillConfig = {
  local: true,
  countLabel: "Builds",
  dimensions: ["reason", "dispatcher", "builtAt", "package", "trigger", "ecosystem"],
  measures: ["count", "avg_noopPct", "sum_noopMinutes", "sum_noopUsd", "sum_minutes"],
  extraDimensions: [
    { key: "reason", label: "Reason", kind: "choice", cardinality: "medium", description: "Why the build shipped nothing new" },
    { key: "dispatcher", label: "Dispatcher", kind: "choice", cardinality: "medium", description: "Who or what requested the build" },
    { key: "builtAt", label: "Day", kind: "time", grains: ["day", "week"], description: "When the build ran" },
    { key: "package", label: "Package", kind: "choice", cardinality: "high", description: "The package built" },
    { key: "trigger", label: "Trigger", kind: "choice", cardinality: "low", description: "What started the build" },
    { key: "ecosystem", label: "Kind", kind: "choice", cardinality: "low", description: "npm, PyPI or Docker" },
  ],
  extraMeasures: [
    { key: "avg_noopPct", label: "No-op %", additive: false, op: "avg", of: "noopPct", lowerIsBetter: true, format: pct },
    { key: "sum_noopMinutes", label: "No-op min", additive: true, op: "sum", of: "noopMinutes", lowerIsBetter: true, format: min },
    { key: "sum_noopUsd", label: "No-op $", additive: true, op: "sum", of: "noopUsd", lowerIsBetter: true, format: (v) => (v === null ? "—" : formatAdminUsd(v)) },
    { key: "sum_minutes", label: "All min", additive: true, op: "sum", of: "minutes", lowerIsBetter: true, format: min },
  ],
  levels: {
    reason: { breakouts: ["dispatcher", "package", "trigger", "builtAt:day"], attributes: [], show: SHOW },
    dispatcher: { breakouts: ["reason", "package", "trigger", "builtAt:day"], attributes: [], show: SHOW },
    package: { breakouts: ["reason", "dispatcher", "trigger", "builtAt:day"], attributes: ["ecosystem"], show: SHOW },
    trigger: { breakouts: ["reason", "dispatcher", "package", "builtAt:day"], attributes: [], show: SHOW },
    ecosystem: { breakouts: ["reason", "package", "dispatcher", "builtAt:day"], attributes: [], show: SHOW },
  },
};

export function BuildWasteBoard() {
  const [days, setDays] = useState("7");
  const { data, isLoading, error } = useQuery({ queryKey: ["ci-package-builds", days], queryFn: () => fetchBuilds(Number(days)) });
  const rows = useMemo(() => toCells(data ?? []), [data]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={rows}
          columns={COLUMNS}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          tableId="ci-build-waste-admin"
          drill={DRILL}
          read={readOf({ loading: isLoading, error: error ? String(error) : null }, { what: "package builds" })}
          emptyState={{ title: "No package builds recorded" }}
          toolbar={{
            title: "Package builds",
            search: true,
            searchPlaceholder: "Search packages, reasons…",
            actions: <SegmentedControl aria-label="Window" value={days} onValueChange={setDays} data={WINDOWS} />,
          }}
        />
      </div>
    </div>
  );
}
