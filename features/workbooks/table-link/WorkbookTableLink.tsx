"use client";

/**
 * The workbook's table link, as an Extensions-menu section plus a small mark by the title: when the
 * active sheet is linked, rows for Update table / Refresh from table / Open table / Unlink and when it
 * last synced; otherwise "Make table" — the ONE "Save to a table" overlay (the existing importer, type
 * inference and reconcile path), after which the sheet is linked to what it made.
 * `?tableSync=update|refresh` (the table page's doors) opens the matching preview on load.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Link2Off, Loader2, RefreshCw, Table2, Upload } from "lucide-react";
import type { FUniver } from "@univerjs/presets";
import { Button } from "@ai-matrx/design-system/controls";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useOpenSaveToTable } from "@/features/overlays/openers/saveToTable";
import { getTableMetadata } from "@/features/data-tables/service";
import { isServiceFailure } from "@/features/data-tables/types";
import { univerSnapshotToRows } from "@/features/workbooks/univer-snapshot-rows";

import { RECORD_ID_HEADER, parseSheet, type TableLink } from "./link-model";
import { matchRowsToRecords } from "./sync-plan";
import { readLinks, readPendingLinks, readTableForSheet, writeLink, writePendingLink, type PendingTableLink } from "./link-service";
import { settleLink, TableSyncDialog, writeCells, type SyncDirection } from "./TableSyncDialog";

/** The workbook's name; with its sheet's when the sheet was named on purpose ("Sheet1" adds nothing). */
export function tableNameOffer(workbookName: string | undefined, sheetName: string): string {
  const book = workbookName?.trim();
  if (!book) return sheetName;
  return /^(sheet|tab)\s*\d*$/i.test(sheetName.trim()) ? book : `${book} — ${sheetName}`;
}

function activeSheetId(api: FUniver | null): string | null {
  try {
    return api?.getActiveWorkbook()?.getActiveSheet()?.getSheetId() ?? null;
  } catch {
    return null;
  }
}

/**
 * After "Save to a table" made (or filled) a table from this sheet: give each sheet row its
 * record's id, matched by values (`matchRowsToRecords`); rows that match nothing are named.
 */
async function linkSheetToNewTable(
  api: FUniver,
  workbookId: string,
  sheetId: string,
  tableId: string,
): Promise<{ link: TableLink; unmatched: number[] }> {
  const table = await readTableForSheet(tableId);
  if (!table.ok) throw new Error(table.error);
  const sheet = parseSheet(api.getActiveWorkbook()?.save(), sheetId);
  if (!sheet) throw new Error("The sheet is no longer in this workbook");
  const byHeader = new Set([...sheet.headers.values()].map((h) => h.trim().toLowerCase()));
  const fields = table.data.fields.filter((f) => byHeader.has(f.header.trim().toLowerCase()));
  if (fields.length === 0) throw new Error("None of the table's columns match this sheet's header row");
  const { matched: assigned, unmatched } = matchRowsToRecords(sheet, fields, table.data.rows);
  const existingIdCol = [...sheet.headers.entries()].find(([, h]) => h.trim() === RECORD_ID_HEADER)?.[0];
  const idCol = existingIdCol ?? sheet.maxCol + 1;
  // A stale id column from an earlier link is rewritten whole: rows that matched nothing are cleared.
  const stale = existingIdCol === undefined ? [] : sheet.rows.filter((r) => !assigned.has(r.row)).map((r) => ({ row: r.row, col: idCol, cell: null }));
  writeCells(api, sheetId, [{ row: 0, col: idCol, cell: { v: RECORD_ID_HEADER, t: 1 } }, ...stale, ...[...assigned].map(([row, id]) => ({ row, col: idCol, cell: { v: id, t: 1 } }))], {});
  api.getActiveWorkbook()?.getSheetBySheetId(sheetId)?.hideColumns(idCol, 1);
  const now = new Date().toISOString();
  const link: TableLink = {
    table_id: tableId,
    organization_id: table.data.organizationId,
    sheet_id: sheetId,
    fields,
    baseline_snapshot_id: null,
    linked_at: now,
    last_synced_at: null,
    last_sync_direction: null,
  };
  const settled = await settleLink(api, workbookId, link, "to_table");
  if (settled) throw new Error(settled);
  return { link: { ...link, last_synced_at: now, last_sync_direction: "to_table" }, unmatched };
}

export function useWorkbookTableLink({
  apiRef,
  workbookId,
  workbookName,
  editable,
  enabled,
}: {
  apiRef: React.RefObject<FUniver | null>;
  workbookId: string;
  /** Offered as the new table's name (a default "Sheet1" says nothing). */
  workbookName?: string;
  editable: boolean;
  /** The editor is booted (the live workbook can be read). */
  enabled: boolean;
}) {
  const searchParams = useSearchParams();
  const openSaveToTable = useOpenSaveToTable();
  const [links, setLinks] = useState<TableLink[] | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [dialog, setDialog] = useState<SyncDirection | null>(null);
  const [linking, setLinking] = useState(false);
  const [pending, setPending] = useState<PendingTableLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([readLinks(workbookId), readPendingLinks(workbookId)]).then(([r, p]) => {
      if (cancelled) return;
      if (!r.ok) {
        toast.error(`Table link: ${r.error}`);
        setLinks([]);
        return;
      }
      setLinks(r.data);
      if (p.ok) setPending(p.data);
    });
    return () => {
      cancelled = true;
    };
  }, [workbookId]);

  // Follow the active sheet tab (the link is per sheet).
  useEffect(() => {
    const api = apiRef.current;
    if (!enabled || !api) return;
    setSheetId(activeSheetId(api));
    const sub = api.addEvent(api.Event.ActiveSheetChanged, () => setSheetId(activeSheetId(api)));
    return () => sub.dispose();
  }, [apiRef, enabled]);

  // A linked workbook opened on a sheet that is not the linked one goes to the linked sheet.
  const link = links?.find((l) => l.sheet_id === sheetId) ?? null;
  const anyLink = links && links.length > 0 ? links[0] : null;

  useEffect(() => {
    const target = link ?? anyLink;
    if (!target) return;
    let cancelled = false;
    void getTableMetadata({ tableId: target.table_id }).then((r) => {
      if (!cancelled) setTableName(isServiceFailure(r) ? null : r.data.table.table_name);
    });
    return () => {
      cancelled = true;
    };
  }, [link, anyLink]);

  // The table page's doors land here.
  const asked = searchParams.get("tableSync");
  useEffect(() => {
    if (!asked || !links || !editable) return;
    const target = links[0];
    if (!target) return;
    const api = apiRef.current;
    if (target.sheet_id !== activeSheetId(api)) api?.getActiveWorkbook()?.setActiveSheet(target.sheet_id);
    setSheetId(target.sheet_id);
    setDialog(asked === "refresh" ? "to_sheet" : "to_table");
    const url = new URL(window.location.href);
    url.searchParams.delete("tableSync");
    replaceAddressWithoutNavigating(url);
  }, [asked, links, editable, apiRef]);

  const onSynced = useCallback(
    (next: TableLink | null) => {
      setLinks((current) => {
        const others = (current ?? []).filter((l) => l.sheet_id !== (next?.sheet_id ?? link?.sheet_id));
        return next ? [...others, next] : others;
      });
    },
    [link],
  );

  /**
   * Finish a link whose table already exists: the editor closed before "Make table" could link it, or
   * a second "Make table" was pressed. The existing table is adopted, never duplicated.
   */
  const finishLink = useCallback(
    async (note: PendingTableLink) => {
      const api = apiRef.current;
      if (!api) return;
      setLinking(true);
      try {
        const made = await linkSheetToNewTable(api, workbookId, note.sheet_id, note.table_id);
        setLinks((current) => [...(current ?? []).filter((l) => l.sheet_id !== note.sheet_id), made.link]);
        setPending((current) => current.filter((p) => p.sheet_id !== note.sheet_id));
        if (made.unmatched.length > 0) {
          toast.error(`Linked; rows ${made.unmatched.slice(0, 8).join(", ")} matched no record and will be added on the next update`);
        } else toast.success("Sheet linked to the table");
      } catch (e) {
        const gone = !(await readTableForSheet(note.table_id)).ok;
        if (gone) {
          // The table it made is no longer there: forget it, so "Make table" starts fresh.
          await writePendingLink(workbookId, note.sheet_id, null);
          setPending((current) => current.filter((p) => p.sheet_id !== note.sheet_id));
        }
        toast.error(`The table was made, but the sheet could not be linked: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLinking(false);
      }
    },
    [apiRef, workbookId],
  );

  // Reopened with a table made but not linked: finish it.
  const resumeNote = editable && links && sheetId && !links.some((l) => l.sheet_id === sheetId) ? pending.find((p) => p.sheet_id === sheetId) ?? null : null;
  const resumed = useRef<string | null>(null);
  useEffect(() => {
    if (!resumeNote || resumed.current === resumeNote.table_id) return;
    resumed.current = resumeNote.table_id;
    void finishLink(resumeNote);
  }, [resumeNote, finishLink]);

  const makeTable = () => {
    const api = apiRef.current;
    const sid = activeSheetId(api);
    if (!api || !sid || !openSaveToTable) return;
    const waiting = pending.find((p) => p.sheet_id === sid);
    if (waiting) {
      void finishLink(waiting);
      return;
    }
    const snapshot = api.getActiveWorkbook()?.save();
    const grid = univerSnapshotToRows(snapshot, { sheetId: sid });
    if (!grid || grid.rows.length < 2) {
      toast.error("Put a header row and at least one row of data on this sheet first");
      return;
    }
    // A Record ID column left from an earlier link is never imported as data.
    const keep = grid.rows[0].map((h, i) => (h.trim() === RECORD_ID_HEADER ? -1 : i)).filter((i) => i >= 0);
    const [headers, ...rows] = grid.rows.map((r) => keep.map((i) => r[i] ?? ""));
    openSaveToTable({
      grid: { headers, rows, from: "sheet" },
      title: tableNameOffer(workbookName, grid.sheetName),
      onSaved: async ({ tableId }) => {
        // The table exists: note it at once, before any editor work, so closing now cannot orphan it.
        const note: PendingTableLink = { sheet_id: sid, table_id: tableId, at: new Date().toISOString() };
        resumed.current = tableId; // this run links it; the reopen-resume below is for a LATER open
        setPending((current) => [...current.filter((p) => p.sheet_id !== sid), note]);
        const noted = await writePendingLink(workbookId, sid, note);
        if (!noted.ok) toast.error(`The table was made; its link could not be noted: ${noted.error}`);
        setLinking(true);
        try {
          // The editor can remount while the overlay loads; always link through the live one.
          const made = await linkSheetToNewTable(apiRef.current ?? api, workbookId, sid, tableId);
          setLinks((current) => [...(current ?? []).filter((l) => l.sheet_id !== sid), made.link]);
          setPending((current) => current.filter((p) => p.sheet_id !== sid));
          if (made.unmatched.length > 0) {
            toast.error(`Linked; rows ${made.unmatched.slice(0, 8).join(", ")} matched no record and will be added on the next update`);
          } else toast.success("Sheet linked to the table");
        } catch (e) {
          toast.error(`The table was made, but the sheet could not be linked: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setLinking(false);
        }
      },
    });
  };

  const unlink = async () => {
    if (!link) return;
    const r = await writeLink(workbookId, link.sheet_id, null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setLinks(r.data);
    toast.success("Unlinked; the table and the sheet no longer sync");
  };

  const none = { ready: false, mark: null, items: null, dialog: null } as const;
  if (!enabled || links === null) return none;

  if (!link) {
    if (!editable) return none;
    return {
      ready: true,
      mark: null,
      items: (
        <DropdownMenuItem
          disabled={linking || !openSaveToTable}
          onSelect={makeTable}
          data-workbook-make-table=""
        >
          {linking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Table2 className="size-4" aria-hidden />}
          Make table
        </DropdownMenuItem>
      ),
      dialog: null,
    };
  }

  const synced = link.last_synced_at ? `Synced ${formatDistanceToNow(new Date(link.last_synced_at), { addSuffix: true })}` : "Not synced yet";
  const rows = (
    <>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{synced}</DropdownMenuLabel>
      {editable && (
        <>
          <DropdownMenuItem onSelect={() => setDialog("to_table")} data-table-link-update="">
            <Upload className="size-4" aria-hidden /> Update table from sheet
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("to_sheet")} data-table-link-refresh="">
            <RefreshCw className="size-4" aria-hidden /> Refresh from table
          </DropdownMenuItem>
        </>
      )}
      <DropdownMenuItem asChild>
        <a href={`/data/${link.table_id}`} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" aria-hidden /> Open table
        </a>
      </DropdownMenuItem>
      {editable && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void unlink()}>
            <Link2Off className="size-4" aria-hidden /> Unlink
          </DropdownMenuItem>
        </>
      )}
    </>
  );
  return {
    ready: true,
    // Google's cloud-icon spot: a small mark by the title, only while this sheet is linked.
    mark: (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="quiet"
            icon={<Table2 aria-hidden />}
            aria-label={`Linked to ${tableName ?? "a table"}`}
            title={`Linked to ${tableName ?? "a table"} · ${synced}`}
            data-workbook-table-link=""
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {rows}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    items: (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger data-workbook-table-link-menu="">
          <Table2 className="mr-2 size-4" aria-hidden /> {tableName ?? "Linked table"}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-56">{rows}</DropdownMenuSubContent>
      </DropdownMenuSub>
    ),
    dialog: dialog ? (
      <TableSyncDialog
        open
        onOpenChange={(o) => !o && setDialog(null)}
        direction={dialog}
        apiRef={apiRef}
        workbookId={workbookId}
        link={link}
        onSynced={onSynced}
      />
    ) : null,
  };
}
