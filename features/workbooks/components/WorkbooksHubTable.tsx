"use client";

// The /workbooks table view — same canonical MatrxDataTable shape the Documents
// hub uses, so both lists inherit table features together.

import type { ReactNode } from "react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxTableMenuSection,
} from "@ai-matrx/design-system/data-table";
import { Badge } from "@/components/ui/badge";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { formatAbsoluteDate, formatRelativeTime, toEpochMs } from "@/utils/datetime";
import type { Workbook } from "@/features/data-tables/types";
import type { FileMenuPayload } from "@/features/file-actions/types";
import { workbookSourceLabel } from "@/features/workbooks/workbook-service";

function columnsFor(menuFor: (wb: Workbook) => ReactNode): MatrxColumnDef<Workbook>[] {
  return [
    {
      id: "name",
      header: "Name",
      accessorKey: "workbook_name",
      filter: "text",
      cell: (wb) => (
        <EntityRef token="workbook" id={wb.id} name={wb.workbook_name} showIcon={false} className="text-sm font-medium" />
      ),
    },
    {
      id: "actions",
      header: "",
      label: "Actions",
      sortable: false,
      filter: false,
      width: 84,
      hideable: false,
      cell: (wb) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {menuFor(wb)}
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessorFn: (wb) => wb.description ?? "",
      filter: "text",
      cell: (wb) => (
        <span className="line-clamp-2 max-w-[22rem] break-words text-xs text-muted-foreground">{wb.description || "—"}</span>
      ),
    },
    {
      id: "source",
      header: "Source",
      accessorFn: (wb) => workbookSourceLabel(wb.source),
      filter: "select",
      cell: (wb) => (
        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
          {workbookSourceLabel(wb.source)}
        </Badge>
      ),
    },
    {
      id: "updated",
      header: "Updated",
      accessorFn: (wb) => wb.updated_at,
      sortValue: (wb) => toEpochMs(wb.updated_at),
      filter: "date",
      defaultSortDirection: "desc",
      cell: (wb) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={formatAbsoluteDate(wb.updated_at)}>
          {formatRelativeTime(wb.updated_at, { style: "long" })}
        </span>
      ),
    },
  ];
}

export function WorkbooksHubTable({
  workbooks,
  menuFor,
  sectionsFor,
}: {
  workbooks: Workbook[];
  menuFor: (wb: Workbook) => ReactNode;
  /** The right-click menu of a row: the same actions as its ⋯ menu. */
  sectionsFor?: (payload: FileMenuPayload<Workbook>) => MatrxTableMenuSection[];
}) {
  return (
    <MatrxDataTable<Workbook>
      tableId="workbooks/hub"
      rowToken="workbook"
      viewTabs={false}
      data={workbooks}
      columns={columnsFor(menuFor)}
      getRowId={(wb) => wb.id}
      getRowHref={(wb) => `/workbooks/${wb.id}`}
      defaultSort={{ id: "updated", direction: "desc" }}
      {...(sectionsFor ? { contextMenu: { sections: sectionsFor } } : {})}
    />
  );
}
