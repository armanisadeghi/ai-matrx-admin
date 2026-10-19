"use client";

// app/(core)/compare/old/_components/CompareOldTable.tsx — each old Knowledge page beside
// the page that replaced it, on the canonical table.

import Link from "next/link";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { COMPARE_PAIRS, type ComparePair } from "./pairs";

const COLUMNS: MatrxColumnDef<ComparePair>[] = [
  {
    id: "page",
    header: "Page",
    accessorFn: (p) => p.name,
    cell: (p) => (
      <div>
        <div className="font-medium">{p.name}</div>
        <div className="text-xs text-muted-foreground">was {p.oldAddress}</div>
        {p.note ? <div className="mt-0.5 text-xs text-muted-foreground">{p.note}</div> : null}
      </div>
    ),
  },
  {
    id: "old",
    header: "Old",
    width: 120,
    accessorFn: (p) => p.oldHref,
    cell: (p) => (
      <Link href={p.oldHref} className="whitespace-nowrap text-primary underline underline-offset-2">
        Old page
      </Link>
    ),
  },
  {
    id: "new",
    header: "New",
    accessorFn: (p) => p.newLabel,
    copyValue: (p) => `${p.newLabel} (${p.newHref})`,
    cell: (p) => (
      <div>
        <Link href={p.newHref} className="whitespace-nowrap text-primary underline underline-offset-2">
          {p.newLabel}
        </Link>
        {p.extra ? (
          <div className="mt-0.5 text-xs">
            <Link href={p.extra.href} className="text-muted-foreground underline underline-offset-2">
              {p.extra.label}
            </Link>
          </div>
        ) : null}
      </div>
    ),
  },
];

export function CompareOldTable() {
  return (
    <MatrxDataTable<ComparePair>
      tableId="compare-old"
      data={COMPARE_PAIRS}
      columns={COLUMNS}
      getRowId={(p) => p.oldHref}
      frameHeight="content"
      cellLines="four"
      hidePagination
      pageSize={Math.max(COMPARE_PAIRS.length, 1)}
      selection={false}
      detail={{ enabled: false }}
      window={{ enabled: false }}
      searchText={(p) => [p.name, p.oldAddress, p.note ?? "", p.newLabel, p.extra?.label ?? ""].join(" ")}
      defaultSort={{ id: "page", direction: "asc" }}
      toolbar={{ title: "Old pages" }}
    />
  );
}
