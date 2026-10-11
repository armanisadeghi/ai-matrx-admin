"use client";

// features/documents/components/DocumentsHubTable.tsx — the /documents list.
//
// 🚨 ON THE CANONICAL TABLE (lane 7 STANDARD-TABLES W5, I2 queue item 1). This list hand-rolled a
// `components/ui/table` grid with its own sort, column filters and "Column filters active" bar, so it
// could not inherit anything the platform table gains — custom fields above all: a field an
// organization adds to its documents never showed as a column here. It is now a `MatrxDataTable`
// with `rowToken="udt_document"`, so the organization's own fields join its columns (hidden until
// picked in Columns), and sort, filter, search, copy and export are the table's.
//
// THE DOOR LAW: the name is an `EntityRef` (cmd-click / new tab) and the row opens the document
// through `getRowHref` — both from the ONE registry entry, which screams when it has no route.

import type { ReactNode } from "react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxTableMenuSection,
} from "@ai-matrx/design-system/data-table";
import { Badge } from "@/components/ui/badge";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { formatAbsoluteDate, formatRelativeTime, toEpochMs } from "@/utils/datetime";
import type { DocumentRow } from "@/features/data-tables/types";
import type { FileMenuPayload } from "@/features/file-actions/types";
import { documentSourceLabel } from "@/features/documents/utils/documentsHubDisplay";

let warnedNoDocumentRoute = false;
function documentHref(id: string): string | undefined {
  const href = tryGetEntityInfo("udt_document")?.hrefFor?.(id);
  if (!href && !warnedNoDocumentRoute) {
    warnedNoDocumentRoute = true;
    console.error(
      "[DocumentsHubTable] entity registry has no `hrefFor` for `udt_document` — " +
        "every door on this table is now dead (row click, name, new tab). " +
        "Fix features/scopes/registry/entityRegistry.ts.",
    );
  }
  return href;
}

function columnsFor(menuFor: (doc: DocumentRow) => ReactNode): MatrxColumnDef<DocumentRow>[] {
  return [
    {
      id: "name",
      header: "Name",
      accessorKey: "document_name",
      filter: "text",
      cell: (doc) => (
        <EntityRef token="udt_document" id={doc.id} name={doc.document_name} showIcon={false} className="text-sm font-medium" />
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
      cell: (doc) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {menuFor(doc)}
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessorFn: (doc) => doc.description ?? "",
      filter: "text",
      cell: (doc) => (
        <span className="line-clamp-2 max-w-[22rem] break-words text-xs text-muted-foreground">{doc.description || "—"}</span>
      ),
    },
    {
      id: "source",
      header: "Source",
      accessorFn: (doc) => documentSourceLabel(doc.source),
      filter: "select",
      cell: (doc) => (
        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
          {documentSourceLabel(doc.source)}
        </Badge>
      ),
    },
    {
      id: "created",
      header: "Created",
      accessorFn: (doc) => doc.created_at,
      sortValue: (doc) => toEpochMs(doc.created_at),
      filter: "date",
      defaultSortDirection: "desc",
      cell: (doc) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={formatAbsoluteDate(doc.created_at)}>
          {formatRelativeTime(doc.created_at, { style: "long" })}
        </span>
      ),
    },
    {
      id: "updated",
      header: "Updated",
      accessorFn: (doc) => doc.updated_at,
      sortValue: (doc) => toEpochMs(doc.updated_at),
      filter: "date",
      defaultSortDirection: "desc",
      cell: (doc) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground" title={formatAbsoluteDate(doc.updated_at)}>
          {formatRelativeTime(doc.updated_at, { style: "long" })}
        </span>
      ),
    },
  ];
}

export function DocumentsHubTable({
  documents,
  menuFor,
  sectionsFor,
}: {
  documents: DocumentRow[];
  menuFor: (doc: DocumentRow) => ReactNode;
  /** The right-click menu of a row: the same actions as its ⋯ menu. */
  sectionsFor?: (payload: FileMenuPayload<DocumentRow>) => MatrxTableMenuSection[];
}) {
  return (
    <MatrxDataTable<DocumentRow>
      tableId="documents/hub"
      rowToken="udt_document"
      viewTabs={false}
      data={documents}
      columns={columnsFor(menuFor)}
      getRowId={(doc) => doc.id}
      getRowHref={(doc) => documentHref(doc.id)}
      defaultSort={{ id: "updated", direction: "desc" }}
      {...(sectionsFor ? { contextMenu: { sections: sectionsFor } } : {})}
    />
  );
}
