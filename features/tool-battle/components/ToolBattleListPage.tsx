"use client";

import { useEffect, useState } from "react";
import { Plus, Swords } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { formatOf } from "../derive";
import { listBattles } from "../service";
import type { BattleView } from "../types";
import { BATTLE_HOME } from "./ToolBattlePage";

type Read = { state: "loading" } | { state: "failed"; error: unknown } | { state: "ready"; battles: BattleView[] };

const TONE = { draft: "neutral", running: "info", completed: "success", failed: "destructive", cancelled: "warning" } as const;
const LABEL = { draft: "Not run", running: "Running", completed: "Done", failed: "No answers", cancelled: "Canceled" } as const;

function best(b: BattleView): string {
  const top = b.summary?.ranking[0];
  const rollup = top ? b.summary?.lanes[top] : undefined;
  if (b.blind || !rollup || !top) return "";
  return `${b.lanes.find((l) => l.lane_id === top)?.label ?? top} · ${formatOf(rollup.succeeded, rollup.cells)}`;
}

const COLUMNS: MatrxColumnDef<BattleView>[] = [
  {
    id: "battle",
    header: "Battle",
    accessorFn: (b) => (b.blind ? "Blind battle" : b.title),
    cell: (b) => <span className="font-medium">{b.blind ? "Blind battle" : b.title}</span>,
  },
  { accessorKey: "jobKey", header: "Job", className: "text-muted-foreground" },
  { id: "sources", header: "Sources", accessorFn: (b) => b.lanes.length, format: { id: "integer" }, className: "tabular-nums" },
  { id: "subjects", header: "Subjects", accessorFn: (b) => b.subjects.length, format: { id: "integer" }, className: "tabular-nums" },
  { id: "best", header: "Best", accessorFn: best, cell: (b) => best(b) || "—", className: "tabular-nums text-muted-foreground" },
  { id: "status", header: "Status", format: { id: "choice" }, accessorFn: (b) => LABEL[b.status], cell: (b) => <Badge tone={TONE[b.status]}>{LABEL[b.status]}</Badge> },
  {
    id: "started",
    header: "Started",
    defaultSortDirection: "desc",
    format: { id: "datetime" },
    sortValue: (b) => b.startedAt ?? b.createdAt,
    accessorFn: (b) => b.startedAt ?? b.createdAt,
    cell: (b) => formatAbsoluteDate(b.startedAt ?? b.createdAt, { dateStyle: "medium", timeStyle: "short" }),
    className: "text-muted-foreground",
  },
];

export function ToolBattleListPage() {
  const [read, setRead] = useState<Read>({ state: "loading" });
  useEffect(() => {
    let alive = true;
    listBattles().then(
      (battles) => alive && setRead({ state: "ready", battles }),
      (error) => alive && setRead({ state: "failed", error }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <RecordPageHeader
        level={{ name: "Tool Battle" }}
        actions={[{ label: "New battle", icon: Plus, href: `${BATTLE_HOME}/new`, primary: true, showLabel: true }]}
      />
      <div className="h-full min-h-0 px-[var(--matrx-page-gutter)] pb-8 pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
        <MatrxDataTable
          urlState={{ id: "tool-battles", defaultSort: { id: "started", direction: "desc" } }}
          toolbar={{ search: true, searchPlaceholder: "Search battles…" }}
          data={read.state === "ready" ? read.battles : []}
          columns={COLUMNS}
          getRowId={(b) => b.id}
          getRowHref={(b) => `${BATTLE_HOME}/${b.id}`}
          read={{
            status: read.state === "failed" ? "error" : read.state,
            error: read.state === "failed" ? read.error : undefined,
            what: "battles",
          }}
          emptyState={{ icon: <Swords />, title: "No battles yet" }}
        />
      </div>
    </>
  );
}
