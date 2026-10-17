"use client";

// Billing › Build waste: package builds that shipped nothing new, per package, on the canonical MatrxDataTable.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { byPackage, fetchBuilds, type PackageWaste } from "./buildWaste";

const WINDOWS = [
  { value: "1", label: "24h" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

export function BuildWasteBoard() {
  const [days, setDays] = useState("7");
  const { data, isLoading, error } = useQuery({ queryKey: ["ci-package-builds", days], queryFn: () => fetchBuilds(Number(days)) });
  const rows = byPackage(data ?? []);

  const columns: MatrxColumnDef<PackageWaste>[] = [
    { id: "package", accessorKey: "package", header: "Package", width: 260 },
    { id: "ecosystem", accessorKey: "ecosystem", header: "Kind", width: 90, filter: "select" },
    { id: "builds", accessorKey: "builds", header: "Builds", width: 90, kpi: [{ op: "sum", id: "builds", label: "Builds" }] },
    {
      id: "noop",
      accessorKey: "noop",
      header: "No-op",
      width: 90,
      tone: (r) => (r.noopPct > 50 ? "danger" : r.noopPct > 30 ? "warning" : undefined),
      kpi: [{ op: "sum", id: "noop", label: "No-op builds", tone: (v) => (v > 0 ? "warning" : undefined) }],
    },
    { id: "noopPct", accessorKey: "noopPct", header: "No-op %", width: 90, cell: (r) => `${r.noopPct}%` },
    { id: "noopMinutes", accessorKey: "noopMinutes", header: "No-op min", width: 100, kpi: [{ op: "sum", id: "noopMinutes", label: "No-op min" }] },
    { id: "minutes", accessorKey: "minutes", header: "All min", width: 90 },
    { id: "noopUsd", accessorKey: "noopUsd", header: "No-op $", width: 100, cell: (r) => formatAdminUsd(r.noopUsd) },
    { id: "topReason", accessorKey: "topReason", header: "Top reason", width: 280, filter: "select", cell: (r) => r.topReason ?? "" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={isLoading}
          tableId="ci-build-waste-admin"
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
