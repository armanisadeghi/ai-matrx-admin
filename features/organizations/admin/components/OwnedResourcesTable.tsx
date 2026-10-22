"use client";

// THE one renderer for "what one person owns, by resource type" (platform.shareable_resource_registry
// types). Two hosts: the org admin member page (org-scoped counts, org_admin_list_member_resources)
// and the platform admin user page's Content tab (every type, newest items, admin.user_owned_resources_shard).
// Rows that carry `newest` get the detail columns and an inline list of their newest records, each
// opened through EntityRef (entity registry route first, the registry's url_path_template otherwise).

import { useState } from "react";
import { formatCount } from "@ai-matrx/kit/format";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import type { MatrxDataTableRead } from "@ai-matrx/design-system/data-table/types";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { displayId } from "@ai-matrx/design-system";

export interface OwnedResourceItem {
  id: string;
  name: string | null;
  updated_at: string | null;
}

export interface OwnedResourceRow {
  resourceType: string;
  displayLabel: string;
  schemaName: string;
  tableName: string;
  /** Null when this type could not be read (see `unread`). */
  count: number | null;
  /** False when `count` is every owned row, trash and archive included (very large holdings). */
  exact?: boolean;
  archived?: number;
  lastUpdatedAt?: string | null;
  urlTemplate?: string | null;
  newest?: OwnedResourceItem[] | null;
  newestSkipped?: string | null;
  /** Why the count is missing: budget, error, missing_table, no_owner_column, shard. */
  unread?: string | null;
  isComponent?: boolean;
}

const UNREAD_WORDS: Record<string, string> = {
  budget: "Timed out",
  error: "Read failed",
  missing_table: "No table",
  no_owner_column: "No owner column",
  shard: "Read failed",
};

/** Where one owned record opens: the entity registry's route wins, the registry template otherwise. */
export function ownedItemHref(row: OwnedResourceRow, id: string): string | undefined {
  if (tryGetEntityInfo(row.resourceType)?.hrefFor) return undefined; // EntityRef resolves it
  if (!row.urlTemplate || !row.urlTemplate.includes("{id}")) return undefined;
  return row.urlTemplate.replace("{id}", encodeURIComponent(id));
}

/** The base columns — the org member page shows exactly these. */
export const OWNED_RESOURCE_COLUMNS: MatrxColumnDef<OwnedResourceRow>[] = [
  {
    id: "type",
    header: "Resource type",
    accessorKey: "displayLabel",
    filter: "text",
    width: 240,
    cell: (row) => <span className="font-medium text-foreground">{row.displayLabel}</span>,
  },
  {
    id: "schema",
    header: "Schema",
    accessorKey: "schemaName",
    filter: "text",
    width: 150,
    mobileHidden: true,
  },
  {
    id: "table",
    header: "Table",
    accessorKey: "tableName",
    filter: "text",
    width: 180,
    mobileHidden: true,
  },
  {
    id: "count",
    header: "Count",
    accessorFn: (row) => row.count ?? -1,
    filter: "number",
    align: "right",
    width: 110,
    cell: (row) =>
      row.count === null ? (
        <Badge tone="warning" title={row.unread ?? undefined}>
          {UNREAD_WORDS[row.unread ?? ""] ?? "Not read"}
        </Badge>
      ) : (
        <span title={row.exact === false ? "Includes trashed and archived rows" : undefined}>
          {row.exact === false ? "≈ " : ""}
          {formatCount(row.count)}
        </span>
      ),
  },
];

function NewestList({ row }: { row: OwnedResourceRow }) {
  if (row.newestSkipped === "large") return <span className="type-secondary text-muted-foreground">Too many to list</span>;
  if (!row.newest?.length) return <span className="type-secondary text-muted-foreground">None</span>;
  return (
    <ul className="grid gap-1 py-1">
      {row.newest.map((item) => (
        <li key={item.id} className="flex min-w-0 items-center justify-between gap-3">
          <EntityRef
            token={row.resourceType}
            id={item.id}
            name={item.name || `${row.displayLabel} ${displayId(item.id)}`}
            href={ownedItemHref(row, item.id)}
            openInNewTab
          />
          {item.updated_at ? (
            <span className="shrink-0 type-meta text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

interface Props {
  tableId: string;
  rows: OwnedResourceRow[];
  read: MatrxDataTableRead | undefined;
  isLoading: boolean;
  isFetching?: boolean;
  title: string;
  emptyTitle: string;
  coverageNoun: string;
  onRefresh: () => void | Promise<void>;
}

export function OwnedResourcesTable({ tableId, rows, read, isLoading, isFetching, title, emptyTitle, coverageNoun, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const detailed = rows.some((r) => r.newest !== undefined || r.newestSkipped);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const detailColumns: MatrxColumnDef<OwnedResourceRow>[] = [
    {
      id: "archived",
      header: "Archived",
      accessorFn: (row) => row.archived ?? 0,
      filter: "number",
      align: "right",
      width: 100,
      cell: (row) => (row.archived ? formatCount(row.archived) : <span className="text-muted-foreground">—</span>),
    },
    { id: "updated", header: "Last updated", accessorKey: "lastUpdatedAt", format: { id: "datetime" }, filter: "date", width: 170 },
    {
      id: "newest",
      header: "Newest",
      accessorFn: (row) => row.newest?.[0]?.name ?? "",
      filter: "text",
      width: 320,
      cell: (row) => {
        const first = row.newest?.[0];
        if (!first) return <NewestList row={row} />;
        return (
          <div className="flex min-w-0 items-center gap-2">
            <EntityRef
              token={row.resourceType}
              id={first.id}
              name={first.name || `${row.displayLabel} ${displayId(first.id)}`}
              href={ownedItemHref(row, first.id)}
              openInNewTab
            />
            {(row.newest?.length ?? 0) > 1 ? (
              <Button variant="quiet" onClick={() => toggle(row.resourceType)}>
                {expanded.has(row.resourceType) ? "Less" : `+${(row.newest?.length ?? 1) - 1}`}
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <MatrxDataTable
      tableId={tableId}
      data={rows}
      columns={detailed ? [...OWNED_RESOURCE_COLUMNS, ...detailColumns] : OWNED_RESOURCE_COLUMNS}
      getRowId={(row) => row.resourceType}
      isLoading={isLoading}
      isFetching={isFetching}
      read={read}
      coverage={{ noun: coverageNoun, answeredBy: "client", total: rows.length }}
      expandedDetail={
        detailed
          ? {
              expandedIds: expanded,
              onExpandedIdsChange: (ids) => setExpanded(ids),
              canExpand: (row) => (row.newest?.length ?? 0) > 1,
              render: (row) => <NewestList row={row} />,
            }
          : undefined
      }
      toolbar={{
        title,
        searchPlaceholder: "Search resource types…",
        refresh: { onRefresh: async () => onRefresh() },
      }}
      emptyState={{ title: emptyTitle }}
    />
  );
}
