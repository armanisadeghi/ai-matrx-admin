"use client";

/**
 * The homes' list view — the canonical table with Google Docs / Sheets' columns first (Name,
 * Owner, Last opened by me) and every column the older hub tables had after them (Last modified,
 * Created, Source), ⋮ last like Google's. Every column sorts and filters; right-click is the same
 * file menu as ⋮. ONE table for workbooks and documents (it replaced WorkbooksHubTable and
 * DocumentsHubTable).
 *
 * `columns="office"` is the Microsoft 365 look's order (Excel / Word on the web): Name, Opened,
 * Owner first — the same columns, the same menus.
 */

import type { ReactNode } from "react";
import { Star, Users } from "lucide-react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxTableMenuSection,
} from "@ai-matrx/design-system/data-table";
import { Badge } from "@ai-matrx/design-system/controls";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { formatAbsoluteDate, toEpochMs } from "@/utils/datetime";
import { cn } from "@/lib/utils";
import type { FileMenuPayload } from "../types";
import type { HomeKind } from "./home-kinds";
import { homeDateLabel, type DatedItem, type HomeSortKey } from "./recent";

type Line<Row> = DatedItem<Row>;

const SORT_COLUMN: Record<HomeSortKey, { id: string; direction: "asc" | "desc" }> = {
  opened: { id: "opened", direction: "desc" },
  "modified-by-me": { id: "updated", direction: "desc" },
  modified: { id: "updated", direction: "desc" },
  title: { id: "name", direction: "asc" },
};

function DateCell({ iso, now }: { iso: string | null | undefined; now: number }) {
  if (!iso) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap text-xs text-muted-foreground" title={formatAbsoluteDate(iso)}>
      {homeDateLabel(toEpochMs(iso), now)}
    </span>
  );
}

export function FileHomeTable<Row>({
  kind,
  items,
  sort,
  opened,
  ownerLabel,
  starredIds,
  userId,
  menuFor,
  sectionsFor,
  marksFor,
  columns: columnSet = "google",
}: {
  kind: HomeKind;
  items: Line<Row>[];
  sort: HomeSortKey;
  opened: ReadonlyMap<string, string>;
  ownerLabel: (ownerId: string) => string;
  starredIds: ReadonlySet<string>;
  userId: string | null;
  menuFor: (row: Row) => ReactNode;
  sectionsFor: (payload: FileMenuPayload<Row>) => MatrxTableMenuSection[];
  marksFor?: (row: Row, where: "card" | "table") => ReactNode;
  /** Column order: Google's (Name, Owner, Last opened by me) or Office's (Name, Opened, Owner). */
  columns?: "google" | "office";
}) {
  const now = Date.now();
  const columns: MatrxColumnDef<Line<Row>>[] = [
    {
      id: "name",
      header: "Name",
      accessorFn: (l) => l.item.name,
      filter: "text",
      cell: (l) => (
        <span className="flex min-w-0 items-center gap-2" title={l.item.description ?? undefined}>
          <kind.Icon className={cn("size-4 shrink-0", kind.iconTone)} aria-hidden />
          <EntityRef token={kind.token} id={l.item.id} name={l.item.name} showIcon={false} className="min-w-0 truncate text-sm font-medium" />
          {userId !== null && l.item.ownerId !== userId ? <Users className="size-3.5 shrink-0 text-muted-foreground" aria-label="Not owned by me" /> : null}
          {starredIds.has(l.item.id) ? <Star className="size-3.5 shrink-0 fill-current text-warning" aria-label="Starred" /> : null}
          {marksFor ? <span className="flex shrink-0 items-center gap-1">{marksFor(l.item.row, "table")}</span> : null}
        </span>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      accessorFn: (l) => ownerLabel(l.item.ownerId),
      filter: "select",
      cell: (l) => <span className="truncate text-xs text-muted-foreground">{ownerLabel(l.item.ownerId)}</span>,
    },
    {
      id: "opened",
      header: columnSet === "office" ? "Opened" : "Last opened by me",
      accessorFn: (l) => opened.get(l.item.id) ?? "",
      sortValue: (l) => (opened.has(l.item.id) ? toEpochMs(opened.get(l.item.id)) : 0),
      filter: "date",
      defaultSortDirection: "desc",
      cell: (l) => <DateCell iso={opened.get(l.item.id)} now={now} />,
    },
    {
      id: "updated",
      header: "Last modified",
      accessorFn: (l) => l.item.updatedAt,
      sortValue: (l) => toEpochMs(l.item.updatedAt),
      filter: "date",
      defaultSortDirection: "desc",
      cell: (l) => <DateCell iso={l.item.updatedAt} now={now} />,
    },
    {
      id: "created",
      header: "Created",
      accessorFn: (l) => l.item.createdAt,
      sortValue: (l) => toEpochMs(l.item.createdAt),
      filter: "date",
      defaultSortDirection: "desc",
      cell: (l) => <DateCell iso={l.item.createdAt} now={now} />,
    },
    {
      id: "source",
      header: "Source",
      accessorFn: (l) => l.item.sourceLabel,
      filter: "select",
      cell: (l) => <Badge>{l.item.sourceLabel}</Badge>,
    },
    {
      id: "actions",
      header: "",
      label: "Actions",
      sortable: false,
      filter: false,
      width: 56,
      hideable: false,
      cell: (l) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          {menuFor(l.item.row)}
        </div>
      ),
    },
  ];

  const ordered =
    columnSet === "office"
      ? ["name", "opened", "owner", "updated", "created", "source", "actions"].map((id) => {
          const c = columns.find((col) => col.id === id)!;
          // Office's list gives the name the room (a wide first column).
          return id === "name" ? { ...c, width: 340 } : c;
        })
      : columns;

  return (
    <MatrxDataTable<Line<Row>>
      key={`${columnSet}-${sort}`}
      tableId={columnSet === "office" ? `${kind.kind}s/home-office` : `${kind.kind}s/home`}
      rowToken={kind.token}
      viewTabs={false}
      data={items}
      columns={ordered}
      getRowId={(l) => l.item.id}
      getRowHref={(l) => kind.href(l.item.id)}
      defaultSort={SORT_COLUMN[sort]}
      contextMenu={{
        sections: (payload) => {
          if (payload.level !== "row" && payload.level !== "cell") return [];
          return sectionsFor({ ...payload, row: payload.row.item.row } as FileMenuPayload<Row>);
        },
      }}
    />
  );
}
