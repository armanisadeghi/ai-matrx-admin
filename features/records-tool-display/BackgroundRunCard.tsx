// row-token: none — draws the tables a background copy made, from any table, not one registry token
"use client";

/**
 * BackgroundRunCard — the live card for a long copy the `records` tool started in the background:
 * a Notion page or database brought in as new tables (`notion_import`), or a mapping copied into
 * tables that already exist (`mapped_sync`).
 *
 * It follows the RUN (`useWorkflowRun` → the `workflowRuns` slice), never the tool answer: the run
 * outlives the turn, so the same card rejoins by `run_id` when the conversation is reopened, and a
 * run that already ended paints its report at once. What it reads is `readBackgroundRun` (pure,
 * tested): the step's `node_progress` while it works, its output when it ends.
 *
 * Layout never shifts while it works: the header, the stage strip, the bar and the one detail line
 * keep their height from the first paint; the quiet note ("last moved Xs ago") has its own slot.
 *
 * Loaded lazily through `features/chat-tool-renderers/toolRendererImpls` (with RecordsAnswerView).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, ArrowUpRight, CircleCheck, Download, Eye } from "lucide-react";
import { Card, CardContent, Progress, Skeleton, type ProgressTone } from "@ai-matrx/design-system";
import { Badge, Button, DisclosureHeader, StageSteps, type BadgeTone } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { tableKindSlug } from "@ai-matrx/records";
import { formatCount } from "@ai-matrx/kit/format";
import { useAppSelector } from "@/lib/redux/hooks";
import { useWorkflowRun } from "@/features/workflow-runtime/hooks/useWorkflowRun";
import { selectRunState } from "@/features/workflow-runtime/redux/workflow-runs.selectors";
import { useOpenWorkflowRunWindow } from "@/features/overlays/definitions/workflowRunWindow.overlay";
import { useTableKind } from "@/components/mardown-display/blocks/result-kinds/use-table-record";
import { useRecordsDataSource } from "@/features/data-tables/records-ui-host/recordsDataSource";
import { tableRowCounts } from "@/features/unified-data/hub/doors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { formatElapsed, useElapsedSince } from "@/lib/progress/elapsed";
import {
  IMPORT_STAGES,
  QUIET_AFTER_MS,
  RATCHET_START,
  STATUS_WORD,
  advanceRatchet,
  readBackgroundRun,
  whatToDoWhenStopped,
  type BackgroundRunKind,
  type BackgroundRunPhase,
  type CopyReport,
  type ImportLoss,
  type ImportReport,
} from "./backgroundRun";
import { tableHref } from "./readRecordsAnswer";

const BADGE_TONE: Record<BackgroundRunPhase, BadgeTone> = {
  opening: "neutral",
  waiting: "neutral",
  working: "primary",
  finished: "success",
  stopped: "destructive",
};

const BAR_TONE: Record<BackgroundRunPhase, ProgressTone> = {
  opening: "default",
  waiting: "default",
  working: "default",
  finished: "success",
  stopped: "destructive",
};

/** Losses listed before the rest is left to the report table. */
const LOSSES_SHOWN = 12;

function isoMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function DoorLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
    >
      {children}
      <ArrowUpRight className="size-3" />
    </Link>
  );
}

export function BackgroundRunCard({ runId, hint }: { runId: string; hint: BackgroundRunKind | null }) {
  useWorkflowRun(runId);
  const run = useAppSelector(selectRunState(runId));
  const openRunWindow = useOpenWorkflowRunWindow();
  const view = readBackgroundRun(run, hint);
  const isImport = view.kind === "import";
  const over = view.phase === "finished" || view.phase === "stopped";

  // THE RATCHET: the stage never steps back and the fill never shrinks (adjusted during render,
  // so a new sample and its bar land in the same paint).
  const [ratchet, setRatchet] = useState(RATCHET_START);
  const next = advanceRatchet(ratchet, isImport ? view.sample : null, view.phase === "finished");
  if (next !== ratchet) setRatchet(next);

  const startedMs = isoMs(view.startedAt);
  const liveMs = useElapsedSince(over ? null : startedMs);
  const endedMs = isoMs(view.endedAt);
  const elapsedMs = over ? (startedMs != null && endedMs != null ? endedMs - startedMs : null) : startedMs != null ? liveMs : null;
  const quietMs = useElapsedSince(view.phase === "working" ? isoMs(view.lastMovedAt) : null);

  const title = isImport
    ? view.name ? `Notion import · ${view.name}` : "Notion import"
    : view.name ? `Copy · ${view.name}` : "Copy into tables";
  const Icon = isImport ? Download : ArrowRightLeft;
  const counted = view.sample?.current != null && view.sample.total != null && view.sample.total > 0;
  const barValue = view.phase === "finished"
    ? 100
    : isImport && ratchet.stageIndex >= 0
      ? Math.round(ratchet.fraction * 100)
      : view.phase === "stopped" ? 0 : null;
  const detail = view.sample?.detail ?? null;

  return (
    <Card size="sm" aria-label={title} className="w-full max-w-2xl">
      <CardContent gap="md">
      <header className="flex min-h-7 items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="type-title min-w-0 flex-1 truncate text-foreground">{title}</h3>
        <Badge tone={BADGE_TONE[view.phase]}>{STATUS_WORD[view.phase]}</Badge>
        <span className="type-meta w-14 shrink-0 text-right tabular-nums text-muted-foreground">
          {elapsedMs != null && elapsedMs >= 1_000 ? formatElapsed(elapsedMs) : ""}
        </span>
        <Button
          variant="quiet"
          icon={<Eye />}
          onClick={() => openRunWindow({ runId, workflowName: title })}
        >
          Open run
        </Button>
      </header>

      {isImport ? (
        <StageSteps
          steps={IMPORT_STAGES}
          current={view.phase === "finished" ? IMPORT_STAGES.length : Math.max(0, ratchet.stageIndex)}
          aria-label="Import stages"
          className="overflow-hidden"
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Progress value={barValue} tone={BAR_TONE[view.phase]} aria-label="Progress" />
        {view.phase === "finished" ? null : <div className="flex h-5 items-center gap-2">
          {view.phase === "opening" || (view.phase === "working" && !view.sample) ? (
            <Skeleton motion="shimmer" shape="line" width="1/3" aria-label="Waiting for the first step" />
          ) : (
            <span className="type-secondary min-w-0 flex-1 truncate text-foreground">
              {view.phase === "waiting" ? "Waiting for a worker" : detail ?? ""}
            </span>
          )}
          {counted && view.phase === "working" ? (
            <span className="type-meta ml-auto shrink-0 tabular-nums text-muted-foreground">
              {formatCount(view.sample?.current ?? 0)} of {formatCount(view.sample?.total ?? 0)}
            </span>
          ) : null}
        </div>}
        {!over ? (
          <p className="type-meta h-4 text-muted-foreground" aria-live="polite">
            {view.readFailure
              ? view.readFailure
              : view.phase === "working" && quietMs >= QUIET_AFTER_MS
                ? `Still working · last moved ${formatElapsed(quietMs)} ago`
                : ""}
          </p>
        ) : null}
      </div>

      {view.phase === "stopped" ? <StoppedNote kind={view.kind} sentence={view.stoppedBecause} /> : null}
      {view.report?.kind === "import" && view.phase === "finished" ? <ImportReportView report={view.report} /> : null}
      {view.report?.kind === "copy" && over ? <CopyReportView report={view.report} /> : null}
      </CardContent>
    </Card>
  );
}

function StoppedNote({ kind, sentence }: { kind: BackgroundRunKind; sentence: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="type-secondary text-foreground">{sentence ?? "It stopped before it finished."}</p>
        <p className="type-secondary text-muted-foreground">{whatToDoWhenStopped(kind)}</p>
      </div>
      <ErrorAlchemyMenu error={sentence ?? "The background copy stopped."} />
    </div>
  );
}

// ── import report ───────────────────────────────────────────────────────────────

interface MadeTable {
  tableId: string;
  rows: number | null;
}

/** "1 databases" reads wrong: a count of one drops the plural "s" the server's label carries. */
function countWord({ label, count }: { label: string; count: number }): string {
  return count === 1 && label.endsWith("s") ? label.slice(0, -1) : label;
}

function ImportReportView({ report }: { report: ImportReport }) {
  const facts = report.counts.map((entry) => `${formatCount(entry.count)} ${countWord(entry)}`).join(" · ");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden />
        <p className="type-secondary min-w-0 flex-1 truncate text-foreground">
          {report.tableIds.length === 1 ? "1 table made" : `${formatCount(report.tableIds.length)} tables made`}
          {facts ? <span className="text-muted-foreground"> · {facts}</span> : null}
        </p>
        {report.reportTableId ? (
          <span className="type-secondary shrink-0">
            <DoorLink href={tableHref(report.reportTableId)}>Report</DoorLink>
          </span>
        ) : null}
      </div>
      {report.tableIds.length > 0 ? <MadeTables tableIds={report.tableIds} /> : null}
      <LossList title="Came over with a difference" losses={report.different} reportTableId={report.reportTableId} />
      <LossList title="Did not come over" losses={report.notCarried} reportTableId={report.reportTableId} />
    </div>
  );
}

/** The tables the import made, with the rows each holds now (`custom.table_row_counts`). */
function MadeTables({ tableIds }: { tableIds: string[] }) {
  const first = useTableKind(tableKindSlug(tableIds[0]));
  const organizationId = first.state === "ready" ? first.facts.organization_id : null;
  const dataSource = useRecordsDataSource();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const idsKey = tableIds.join(",");
  useEffect(() => {
    if (!organizationId) return;
    let live = true;
    void tableRowCounts(dataSource, organizationId, idsKey.split(",")).then((answer) => {
      if (!live) return;
      if (!answer.ok) {
        console.error("[BackgroundRunCard] row counts not read:", answer.error.message);
        return;
      }
      setCounts(Object.fromEntries(answer.data.map((row) => [row.table_id, row.visible_rows])));
    });
    return () => {
      live = false;
    };
  }, [dataSource, organizationId, idsKey]);

  const rows: MadeTable[] = tableIds.map((tableId) => ({ tableId, rows: counts?.[tableId] ?? null }));
  const columns: MatrxColumnDef<MadeTable>[] = [
    {
      id: "table",
      header: "Table",
      label: "Table",
      accessorFn: (row) => row.tableId,
      cell: (row) => <TableName tableId={row.tableId} />,
    },
    {
      id: "rows",
      header: "Rows",
      label: "Rows",
      accessorFn: (row) => row.rows,
      cell: (row) => (
        <span className="tabular-nums text-foreground">{row.rows == null ? "—" : formatCount(row.rows)}</span>
      ),
    },
  ];
  return (
    <MatrxDataTable<MadeTable>
      data={rows}
      columns={columns}
      getRowId={(row) => row.tableId}
      getRowHref={(row) => tableHref(row.tableId)}
      appearance="embedded"
      hideToolbar
      hidePagination={rows.length <= 10}
      viewTabs={false}
      urlState={false}
      reorderableColumns={false}
      resizableColumns={false}
      detail={{ enabled: false }}
      selection={false}
      copyControls={{ row: false }}
    />
  );
}

function TableName({ tableId }: { tableId: string }) {
  const kind = useTableKind(tableKindSlug(tableId));
  if (kind.state === "loading") return <Skeleton motion="shimmer" shape="line" width="1/2" aria-label="Loading the table" />;
  if (kind.state === "refused") return <span className="text-muted-foreground">{kind.sentence}</span>;
  return <span className="truncate text-foreground">{kind.name ?? "Table"}</span>;
}

function LossList({ title, losses, reportTableId }: { title: string; losses: ImportLoss[]; reportTableId: string | null }) {
  const [open, setOpen] = useState(false);
  if (losses.length === 0) return null;
  const shown = losses.slice(0, LOSSES_SHOWN);
  const more = losses.length - shown.length;
  return (
    <div className="flex flex-col">
      <DisclosureHeader open={open} onClick={() => setOpen(!open)} title={title} meta={formatCount(losses.length)} />
      {open ? (
        <ul className="flex flex-col gap-1 pb-1 pl-6">
          {shown.map((loss) => (
            <li key={`${loss.kind ?? ""}:${loss.item}`} className="type-secondary flex min-w-0 gap-1.5">
              <span className="shrink-0 text-foreground">{loss.item}</span>
              {loss.reason ? <span className="min-w-0 truncate text-muted-foreground" title={loss.reason}>{loss.reason}</span> : null}
            </li>
          ))}
          {more > 0 ? (
            <li className="type-secondary text-muted-foreground">
              {formatCount(more)} more{reportTableId ? <> · <DoorLink href={tableHref(reportTableId)}>Report</DoorLink></> : null}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

// ── copy report ─────────────────────────────────────────────────────────────────

type CopyRow = CopyReport["perTable"][number] & { key: string };

function CopyReportView({ report }: { report: CopyReport }) {
  const rows: CopyRow[] = report.perTable.map((row, index) => ({ ...row, key: row.tableId ?? `${row.name ?? "table"}:${index}` }));
  const number = (pick: (row: CopyRow) => number): Pick<MatrxColumnDef<CopyRow>, "accessorFn" | "cell"> => ({
    accessorFn: pick,
    cell: (row) => <span className="tabular-nums text-foreground">{formatCount(pick(row))}</span>,
  });
  const columns: MatrxColumnDef<CopyRow>[] = [
    {
      id: "table",
      header: "Table",
      label: "Table",
      accessorFn: (row) => row.name,
      cell: (row) => <span className="truncate text-foreground">{row.name ?? "Table"}</span>,
    },
    { id: "added", header: "Added", label: "Added", ...number((row) => row.added) },
    { id: "updated", header: "Updated", label: "Updated", ...number((row) => row.updated) },
    { id: "archived", header: "Archived", label: "Archived", ...number((row) => row.archived) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {report.finished ? <CircleCheck className="size-3.5 shrink-0 text-success" aria-hidden /> : null}
        <p className="type-secondary min-w-0 flex-1 truncate text-foreground">
          {formatCount(report.added)} added · {formatCount(report.updated)} updated · {formatCount(report.archived)} archived
          {report.conflicts > 0 ? (
            <span className="text-muted-foreground"> · {formatCount(report.conflicts)} kept your version</span>
          ) : null}
        </p>
      </div>
      {rows.length > 0 ? (
        <MatrxDataTable<CopyRow>
          data={rows}
          columns={columns}
          getRowId={(row) => row.key}
          getRowHref={(row) => (row.tableId ? tableHref(row.tableId) : undefined)}
          appearance="embedded"
          hideToolbar
          hidePagination={rows.length <= 10}
          viewTabs={false}
          urlState={false}
          reorderableColumns={false}
          resizableColumns={false}
          detail={{ enabled: false }}
          selection={false}
          copyControls={{ row: false }}
        />
      ) : null}
    </div>
  );
}
