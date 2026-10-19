"use client";

// features/crm/components/import/ImportPreviewTable.tsx
//
// The dry-run preview of the /crm/import wizard on the shared MatrxDataTable:
// selection (only rows the commit will write), search, sort, filters, a column
// per mapped field and a Status column so invalid rows can be found and filtered.

import { Building2, UserRound } from "lucide-react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { cn } from "@/lib/utils";
import type {
  ImportField,
  ImportMapping,
  ImportPlan,
  RowPlan,
} from "../../import/types";
import { IMPORT_FIELD_LABELS } from "../../import/types";

export const STATUS_META: Record<
  RowPlan["status"],
  { label: string; className: string }
> = {
  create: {
    label: "New",
    className: "bg-primary/10 text-primary-ink border border-primary/30",
  },
  exists: {
    label: "Exists",
    className: "bg-muted text-muted-foreground border border-border",
  },
  duplicate_in_file: {
    label: "Duplicate row",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30",
  },
  invalid: {
    label: "Invalid",
    className:
      "bg-destructive/10 text-destructive-ink border border-destructive/30",
  },
};

export const isImportable = (row: RowPlan) =>
  row.status === "create" || row.status === "exists";

/** One extra column per mapped field the Name/Contact/Company trio does not already carry. */
const FIELD_COLUMNS: {
  field: ImportField;
  value: (row: RowPlan) => string | undefined;
}[] = [
  { field: "first_name", value: (r) => r.firstName },
  { field: "last_name", value: (r) => r.lastName },
  { field: "legal_name", value: (r) => r.legalName },
  { field: "job_title", value: (r) => r.jobTitle },
  { field: "headline", value: (r) => r.headline },
  { field: "primary_domain", value: (r) => r.primaryDomain },
];

interface ImportPreviewTableProps {
  plan: ImportPlan;
  mapping: ImportMapping;
  selectedRowNumbers: Set<number>;
  onSelectedRowNumbersChange: (next: Set<number>) => void;
}

export function ImportPreviewTable({
  plan,
  mapping,
  selectedRowNumbers,
  onSelectedRowNumbersChange,
}: ImportPreviewTableProps) {
  const mapped = new Set(Object.values(mapping).filter(Boolean));
  const isPerson = plan.kind === "person";

  const columns: MatrxColumnDef<RowPlan>[] = [
    {
      id: "rowNumber",
      header: "#",
      accessorKey: "rowNumber",
      format: { id: "integer" },
      width: 70,
    },
    {
      id: "name",
      header: "Name",
      accessorFn: (row) => row.displayName || "",
      width: 200,
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5">
          {isPerson ? (
            <UserRound className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Building2 className="h-3 w-3 text-muted-foreground" />
          )}
          {row.displayName || "—"}
        </span>
      ),
    },
    ...FIELD_COLUMNS.filter(({ field }) => mapped.has(field)).map(
      ({ field, value }): MatrxColumnDef<RowPlan> => ({
        id: field,
        header: IMPORT_FIELD_LABELS[field],
        accessorFn: (row) => value(row) ?? "",
        width: 150,
      }),
    ),
    {
      id: "contact",
      header: "Contact",
      accessorFn: (row) => [...row.emails, ...row.phones].join(" · "),
      width: 240,
      cell: (row) => [...row.emails, ...row.phones].join(" · ") || "—",
    },
    ...(isPerson
      ? [
          {
            id: "company",
            header: "Company",
            accessorFn: (row) => row.companyName ?? "",
            width: 180,
            cell: (row) =>
              row.companyName ? (
                row.existingEmployer ? (
                  <EntityRef
                    token="party"
                    id={row.existingEmployer.id}
                    name={row.existingEmployer.display_name}
                    openInNewTab
                    alwaysShowActions
                  />
                ) : (
                  <span>
                    {row.companyName}
                    {row.status === "create" ? " (new)" : ""}
                  </span>
                )
              ) : (
                "—"
              ),
          } satisfies MatrxColumnDef<RowPlan>,
        ]
      : []),
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => STATUS_META[row.status].label,
      format: { id: "choice" },
      width: 130,
      cell: (row) => (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium",
            STATUS_META[row.status].className,
          )}
        >
          {STATUS_META[row.status].label}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Notes",
      accessorFn: (row) =>
        [
          row.existing?.display_name,
          row.duplicateOfRow !== undefined
            ? `same as row ${row.duplicateOfRow}`
            : "",
          row.problems.join("; "),
        ]
          .filter(Boolean)
          .join(" "),
      width: 300,
      cell: (row) => (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {row.existing && (
            <EntityRef
              token="party"
              id={row.existing.id}
              name={row.existing.display_name}
              openInNewTab
              alwaysShowActions
            />
          )}
          {row.duplicateOfRow !== undefined && (
            <span>same as row {row.duplicateOfRow}</span>
          )}
          {row.problems.length > 0 && (
            <span>
              {row.problems.join("; ")}
              <ErrorAlchemyMenu />
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <MatrxDataTable<RowPlan>
      tableId="crm.import.preview"
      data={plan.rows}
      columns={columns}
      getRowId={(row) => String(row.rowNumber)}
      defaultSort={{ id: "rowNumber", direction: "asc" }}
      toolbar={{
        titleCount: { value: plan.rows.length, label: "rows" },
        searchPlaceholder: "Search rows",
      }}
      selection={{
        selectedIds: [...selectedRowNumbers].map(String),
        onSelectedIdsChange: (ids) =>
          onSelectedRowNumbersChange(new Set(ids.map(Number))),
        // Only rows the commit writes carry a checkbox.
        isRowSelectable: isImportable,
        noun: "row",
      }}
    />
  );
}
