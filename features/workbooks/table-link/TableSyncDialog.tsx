"use client";

/**
 * The ONE preview-then-apply dialog for a linked sheet, both directions. It runs inside the open
 * workbook editor (the live sheet is read from Univer, written through Univer, so collab and
 * autosave carry every change); the table page's "Update from workbook" / "Refresh workbook"
 * open the workbook with `?tableSync=` and land here. Nothing is written until Apply.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, ExternalLink, Loader2, RefreshCw, Upload } from "lucide-react";
import type { FUniver } from "@univerjs/presets";
import type { ICellData } from "@univerjs/core";
import { Button } from "@ai-matrx/design-system/controls";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/toast";
import { saveSnapshot } from "@/features/workbooks/workbook-service";
import { isServiceFailure } from "@/features/data-tables/types";

import { RECORD_ID_HEADER, displayText, linkStyles, parseSheet, type ParsedSheet, type TableLink } from "./link-model";
import { describeIssue, offListCells, planToSheet, planToTable, resolveOffList, type CellWrite, type ListDecision, type ToSheetPlan, type ToTablePlan } from "./sync-plan";
import { addColumnsAsFields, addWordsToChoices, applyPlanToTable, openTableAsWorkbook, readBaseline, readTableForSheet, writeLink, type PlanChoice } from "./link-service";

export type SyncDirection = "to_table" | "to_sheet";

type Loaded =
  | { state: "loading" }
  | { state: "error"; error: string }
  | { state: "ready"; direction: "to_table"; plan: ToTablePlan; sheet: ParsedSheet; tableName: string }
  | { state: "ready"; direction: "to_sheet"; plan: ToSheetPlan; sheet: ParsedSheet; tableName: string };

function liveSnapshot(api: FUniver | null): unknown {
  return api?.getActiveWorkbook()?.save() ?? null;
}

/** Write cells into the live sheet through Univer (styles inline, so any workbook can take them). */
export function writeCells(api: FUniver, sheetId: string, writes: readonly CellWrite[], styles: Record<string, unknown>): void {
  const ws = api.getActiveWorkbook()?.getSheetBySheetId(sheetId);
  if (!ws) throw new Error("The linked sheet is no longer in this workbook");
  const lastRow = writes.reduce((m, w) => Math.max(m, w.row), 0);
  if (lastRow >= ws.getMaxRows()) ws.setRowCount(lastRow + 200);
  const lastCol = writes.reduce((m, w) => Math.max(m, w.col), 0);
  if (lastCol >= ws.getMaxColumns()) ws.setColumnCount(lastCol + 5);
  for (const w of writes) {
    const range = ws.getRange(w.row, w.col);
    if (!w.cell) {
      range.clearContent();
      continue;
    }
    const style = typeof w.cell.s === "string" ? styles[w.cell.s] : undefined;
    range.setValue({ v: w.cell.v ?? null, ...(w.cell.t ? { t: w.cell.t } : {}), ...(style ? { s: style } : {}) } as ICellData);
  }
}

/** Save the sheet as it now is and make it the link's baseline. */
export async function settleLink(api: FUniver, workbookId: string, link: TableLink, direction: SyncDirection, fields = link.fields): Promise<string | null> {
  const snapshot = liveSnapshot(api);
  const saved = await saveSnapshot({ workbookId, snapshot, origin: "manual", label: direction === "to_table" ? "Updated table" : "Refreshed from table" });
  if (isServiceFailure(saved)) return saved.error;
  const written = await writeLink(workbookId, link.sheet_id, {
    ...link,
    fields,
    baseline_snapshot_id: saved.data.id,
    last_synced_at: new Date().toISOString(),
    last_sync_direction: direction,
  });
  return written.ok ? null : written.error;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function shown(v: unknown): string {
  const text = displayText(v);
  return text === "" ? "empty" : text.length > 40 ? `${text.slice(0, 39)}…` : text;
}

function Section({
  checked,
  onChecked,
  title,
  children,
  tone,
}: {
  checked?: boolean;
  onChecked?: (v: boolean) => void;
  title: string;
  children?: ReactNode;
  tone?: "warn";
}) {
  return (
    <details className="group rounded-md border border-border" data-table-sync-section="">
      <summary className="flex items-center gap-2 px-2 py-1.5 text-sm">
        {onChecked ? (
          <Checkbox checked={checked} onCheckedChange={(v) => onChecked(v === true)} onClick={(e) => e.stopPropagation()} aria-label={title} />
        ) : null}
        <span className={tone === "warn" ? "text-amber-600 dark:text-amber-500" : undefined}>{title}</span>
      </summary>
      {children ? <div className="max-h-48 overflow-y-auto border-t border-border px-2 py-1 text-xs">{children}</div> : null}
    </details>
  );
}

function Line({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1 py-0.5 text-muted-foreground">{children}</div>;
}

export function TableSyncDialog({
  open,
  onOpenChange,
  direction,
  apiRef,
  workbookId,
  link,
  onSynced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: SyncDirection;
  apiRef: React.RefObject<FUniver | null>;
  workbookId: string;
  link: TableLink;
  onSynced: (link: TableLink | null) => void;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [choice, setChoice] = useState<PlanChoice>({ added: true, changed: true, removed: true, conflicts: true });
  const [extras, setExtras] = useState<Set<number>>(new Set());
  const [decisions, setDecisions] = useState<Record<string, ListDecision>>({});
  const [busy, setBusy] = useState<null | "apply" | "fresh">(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoaded({ state: "loading" });
    setDecisions({});
    (async () => {
      const sheet = parseSheet(liveSnapshot(apiRef.current), link.sheet_id);
      if (!sheet) return { state: "error", error: "The linked sheet is no longer in this workbook" } as const;
      const [baseline, table] = await Promise.all([readBaseline(link), readTableForSheet(link.table_id, link.fields)]);
      if (!table.ok) return { state: "error", error: table.error } as const;
      const fields = { fields: table.data.fields };
      if (direction === "to_table") {
        return { state: "ready", direction, sheet, tableName: table.data.name, plan: planToTable({ sheet, baseline, link: fields, tableRows: table.data.rows }) } as const;
      }
      return {
        state: "ready",
        direction,
        sheet,
        tableName: table.data.name,
        plan: planToSheet({ sheet, baseline, link: fields, tableRows: table.data.rows, display: table.data.display }),
      } as const;
    })()
      .then((next) => !cancelled && setLoaded(next))
      .catch((e: unknown) => !cancelled && setLoaded({ state: "error", error: e instanceof Error ? e.message : String(e) }));
    return () => {
      cancelled = true;
    };
  }, [open, direction, link, apiRef, round]);

  const restoreHeader = (col: number, header: string) => {
    const api = apiRef.current;
    if (!api) return;
    api.getActiveWorkbook()?.getSheetBySheetId(link.sheet_id)?.getRange(0, col).setValue(header);
    setRound((r) => r + 1);
  };

  const exportFresh = async () => {
    setBusy("fresh");
    const made = await openTableAsWorkbook(link.table_id);
    if (!made.ok) {
      setBusy(null);
      toast.error(made.error);
      return;
    }
    // This workbook stops syncing; the fresh one takes the link.
    await writeLink(workbookId, link.sheet_id, null);
    onSynced(null);
    setBusy(null);
    onOpenChange(false);
    router.push(made.data.href);
  };

  const apply = async () => {
    const api = apiRef.current;
    if (!api || loaded.state !== "ready") return;
    setBusy("apply");
    try {
      if (loaded.direction === "to_table") {
        let fields = link.fields;
        let plan = loaded.plan;
        const picked = loaded.plan.located.extraColumns.filter((c) => extras.has(c.col));
        if (picked.length > 0) {
          const grown = await addColumnsAsFields(link.table_id, loaded.sheet, picked, link.fields);
          if (!grown.ok) throw new Error(grown.error);
          fields = grown.data;
          const [baseline, table] = await Promise.all([readBaseline(link), readTableForSheet(link.table_id, fields)]);
          if (!table.ok) throw new Error(table.error);
          fields = table.data.fields;
          plan = planToTable({ sheet: loaded.sheet, baseline, link: { fields }, tableRows: table.data.rows });
        }
        // Words the list lacks: the person's answer (add it / skip the row); the rest applies either way.
        const resolved = resolveOffList(plan, decisions, { added: choice.added, changed: choice.changed });
        plan = resolved.plan;
        const taught = await addWordsToChoices(link.table_id, resolved.words);
        if (!taught.ok) throw new Error(taught.error);
        const applied = await applyPlanToTable(link.table_id, plan, choice);
        if (!applied.ok) throw new Error(applied.error);
        const idCol = plan.located.idCol;
        if (idCol !== null && applied.data.newIds.length > 0) {
          writeCells(api, link.sheet_id, applied.data.newIds.map((n) => ({ row: n.row, col: idCol, cell: { v: n.id, t: 1 } })), {});
        }
        const settled = await settleLink(api, workbookId, link, "to_table", fields);
        if (settled) throw new Error(settled);
        onSynced({ ...link, fields, last_synced_at: new Date().toISOString(), last_sync_direction: "to_table" });
        const { added, changed, removed } = applied.data.counts;
        if (applied.data.refused.length > 0) toast.error(`Some rows were refused: ${applied.data.refused.slice(0, 3).join("; ")}`);
        toast.success(`Table updated: ${added} added, ${changed} changed, ${removed} archived${resolved.skipped > 0 ? `, ${plural(resolved.skipped, "row")} skipped` : ""}`);
      } else {
        const plan = loaded.plan;
        writeCells(api, link.sheet_id, plan.writes, linkStyles(link.fields));
        const settled = await settleLink(api, workbookId, link, "to_sheet");
        if (settled) throw new Error(settled);
        onSynced({ ...link, last_synced_at: new Date().toISOString(), last_sync_direction: "to_sheet" });
        toast.success(`Sheet refreshed: ${plan.updated.length} updated, ${plan.appended.length} added, ${plan.cleared.length} cleared`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const title = direction === "to_table" ? "Update table from sheet" : "Refresh sheet from table";
  const issues = loaded.state === "ready" ? loaded.plan.issues : [];
  const blocking = loaded.state === "ready" && loaded.plan.blocking;

  let nothing = false;
  let body: ReactNode = null;
  if (loaded.state === "loading") {
    body = (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Comparing sheet and table
      </div>
    );
  } else if (loaded.state === "error") {
    body = <p className="py-4 text-sm text-destructive">{loaded.error}</p>;
  } else if (loaded.direction === "to_table") {
    const p = loaded.plan;
    const conflicts = p.changed.reduce((n, r) => n + r.changes.filter((c) => c.conflict).length, 0);
    nothing = p.added.length + p.changed.length + p.removed.length === 0 && extras.size === 0;
    const offList = offListCells(p);
    body = (
      <>
        {p.added.length > 0 && (
          <Section title={`Add ${plural(p.added.length, "new row")}`} checked={choice.added} onChecked={(v) => setChoice({ ...choice, added: v })}>
            {p.added.map((a) => (
              <Line key={a.row}>
                Row {a.row} · {a.label}
                {a.problems.filter((x) => !x.notInList).length > 0 && <span className="text-amber-600 dark:text-amber-500"> · {a.problems.filter((x) => !x.notInList).map((x) => `${x.header}: ${x.problem}`).join(", ")}</span>}
              </Line>
            ))}
          </Section>
        )}
        {p.changed.length > 0 && (
          <Section title={`Change ${plural(p.changed.length, "row")}`} checked={choice.changed} onChecked={(v) => setChoice({ ...choice, changed: v })}>
            {p.changed.map((r) =>
              r.changes.map((c) => (
                <Line key={`${r.id}-${c.field_name}`}>
                  Row {r.row} · {r.label} · {c.header}: {shown(c.from)} <ArrowRight className="size-3" aria-hidden /> {shown(c.to)}
                  {c.conflict && <span className="text-amber-600 dark:text-amber-500"> · also changed in table</span>}
                  {c.problem && !c.notInList && <span className="text-amber-600 dark:text-amber-500"> · {c.problem}</span>}
                </Line>
              )),
            )}
          </Section>
        )}
        {offList.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1 text-xs" data-table-sync-offlist="">
            <div className="py-0.5 text-amber-600 dark:text-amber-500">{plural(offList.length, "word")} not in the choice list</div>
            {offList.map((c) => {
              const decision = decisions[c.key] ?? "add";
              return (
                <div key={c.key} className="flex flex-wrap items-center gap-2 py-0.5" data-table-sync-offlist-cell={c.key}>
                  <span className="min-w-0 flex-1 truncate">
                    Row {c.row} · {c.header}: &ldquo;{c.word}&rdquo;
                  </span>
                  <Button variant={decision === "add" ? "primary" : "outline"} onClick={() => setDecisions({ ...decisions, [c.key]: "add" })} aria-pressed={decision === "add"}>
                    Add as a choice
                  </Button>
                  <Button variant={decision === "skip" ? "primary" : "outline"} onClick={() => setDecisions({ ...decisions, [c.key]: "skip" })} aria-pressed={decision === "skip"}>
                    Skip this row
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {conflicts > 0 && (
          <Section title={`Use the sheet's value in ${plural(conflicts, "conflict")}`} checked={choice.conflicts} onChecked={(v) => setChoice({ ...choice, conflicts: v })} tone="warn" />
        )}
        {p.removed.length > 0 && (
          <Section title={`Archive ${plural(p.removed.length, "row")} deleted in the sheet`} checked={choice.removed} onChecked={(v) => setChoice({ ...choice, removed: v })}>
            {p.removed.map((r) => (
              <Line key={r.id}>{r.label}</Line>
            ))}
          </Section>
        )}
        {p.located.extraColumns.length > 0 && (
          <Section title={`${plural(p.located.extraColumns.length, "new column")} — ignored unless added`}>
            {p.located.extraColumns.map((c) => (
              <label key={c.col} className="flex items-center gap-2 py-0.5">
                <Checkbox
                  checked={extras.has(c.col)}
                  onCheckedChange={(v) => {
                    const next = new Set(extras);
                    if (v === true) next.add(c.col);
                    else next.delete(c.col);
                    setExtras(next);
                  }}
                />
                Column {c.letter} · {c.header} · add as field
              </label>
            ))}
          </Section>
        )}
        {(p.tableNewer > 0 || p.readonlyEdits > 0) && (
          <div className="px-1 text-xs text-muted-foreground">
            {p.tableNewer > 0 && <div>{plural(p.tableNewer, "newer table value")} kept</div>}
            {p.readonlyEdits > 0 && <div>{plural(p.readonlyEdits, "edit")} in read-only columns ignored</div>}
          </div>
        )}
      </>
    );
  } else {
    const p = loaded.plan;
    nothing = p.writes.length === 0;
    body = (
      <>
        {p.updated.length > 0 && (
          <Section title={`Update ${plural(p.updated.length, "row")}`}>
            {p.updated.map((r) =>
              r.changes.map((c) => (
                <Line key={`${r.id}-${c.field_name}`}>
                  Row {r.row} · {r.label} · {c.header}: {shown(c.from)} <ArrowRight className="size-3" aria-hidden /> {shown(c.to)}
                  {c.conflict && <span className="text-amber-600 dark:text-amber-500"> · sheet edit replaced</span>}
                </Line>
              )),
            )}
          </Section>
        )}
        {p.appended.length > 0 && (
          <Section title={`Add ${plural(p.appended.length, "record")} below the last row`}>
            {p.appended.map((r) => (
              <Line key={r.id}>
                Row {r.row} · {r.label}
              </Line>
            ))}
          </Section>
        )}
        {p.cleared.length > 0 && (
          <Section title={`Clear ${plural(p.cleared.length, "row")} no longer in the table`} tone="warn">
            {p.cleared.map((r) => (
              <Line key={r.id}>
                Row {r.row} · {r.label}
              </Line>
            ))}
          </Section>
        )}
        {(p.sheetEditsKept > 0 || p.sheetOnlyRows > 0) && (
          <div className="px-1 text-xs text-muted-foreground">
            {p.sheetEditsKept > 0 && <div>{plural(p.sheetEditsKept, "sheet edit")} not in the table yet, kept</div>}
            {p.sheetOnlyRows > 0 && <div>{plural(p.sheetOnlyRows, "new sheet row")} not in the table yet, kept</div>}
          </div>
        )}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-table-sync-dialog={direction}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {loaded.state === "ready" && (
            <a href={`/data/${link.table_id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {loaded.tableName} <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
          {issues.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs" data-table-sync-issues="">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
                  <span className="flex-1">{describeIssue(issue)}</span>
                  {issue.kind === "missing_header" && issue.col !== null && (
                    <Button variant="quiet" onClick={() => restoreHeader(issue.col!, issue.header)} data-table-sync-fix="">
                      Restore header
                    </Button>
                  )}
                </div>
              ))}
              <div className="text-muted-foreground">Keep row 1 and the hidden {RECORD_ID_HEADER} column intact to stay linked</div>
            </div>
          )}
          {body}
          {loaded.state === "ready" && issues.length === 0 && (
            <div className="px-1 text-xs text-muted-foreground" data-table-sync-rules="">
              Stays linked while row 1 and the hidden {RECORD_ID_HEADER} column are intact
            </div>
          )}
          {loaded.state === "ready" && nothing && !blocking && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Check className="size-4" aria-hidden /> Already in sync
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            {(issues.length > 0 || loaded.state === "error") && (
              <Button
                variant="outline"
                icon={busy === "fresh" ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
                disabled={busy !== null}
                onClick={() => void exportFresh()}
                title="A new linked workbook from the table; this one stops syncing"
              >
                Export fresh copy
              </Button>
            )}
            <Button
              variant="primary"
              icon={busy === "apply" ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              disabled={loaded.state !== "ready" || blocking || nothing || busy !== null}
              onClick={() => void apply()}
              data-table-sync-apply=""
            >
              {direction === "to_table" ? "Update table" : "Refresh sheet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
