"use client";

// features/spaces/io/NotionSyncBar.tsx — LANE NOTION-SYNC. A table brought in from a connected Notion
// remembers its Notion database (aidream users.notion_sync_source): this is its header chip, its
// "Sync now" and the sync report (last run, rows added / updated / archived, conflicts).
// Absent on any table that did not come from a connected Notion. Event-driven: a press here, the agent
// action `notion_sync`, or Notion's signed webhook — never a schedule.

import { Button } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { tableShapeChanged, useTable } from "@ai-matrx/records/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { postJson } from "@/lib/python-client";
import { readNotionSyncState } from "./notionSyncState";
import { followSyncRun, isSyncWaiting, runningSync, syncRunFailure, type NotionSyncWaiting } from "./notionSyncWaiting";
import { HeldKeptChip } from "@/features/unified-data/table-page/HeldArchiveLine";
import { answerHold, keptHold, openHold } from "@/features/unified-data/table-page/heldArchive";
import { usePublishHeld } from "@/features/unified-data/table-page/heldArchiveStore";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";

export interface NotionSyncConflict {
  notion_id: string;
  title?: string | null;
  notion_edited_at?: string | null;
  kept?: string;
  note?: string;
}

export interface NotionSyncReport {
  trigger?: string;
  finished_at?: string;
  added?: number;
  updated?: number;
  archived?: number;
  conflicts?: NotionSyncConflict[];
  notices?: string[];
  /** Rows Notion no longer lists that were NOT archived: the server's archive guard holds them for the person's yes. */
  archive_held?: number;
  /** With archive_held: the exact confirmation for those rows, sent back by Archive. */
  archive_confirm?: string | null;
  /** The confirmation the person answered Keep to (remembered on the server). */
  archive_kept?: string | null;
}

/** The held archive's own notice carries an agent call; the bar asks instead, so it is never shown raw. */
export function shownNotices(report: NotionSyncReport): string[] {
  return (report.notices ?? []).filter((n) => !(report.archive_held && n.startsWith("Nothing was archived")));
}

interface SyncState {
  connected: boolean;
  synced_at?: string | null;
  report?: NotionSyncReport | null;
}

const TRIGGER_WORDS: Record<string, string> = { import: "import", manual: "Sync now", webhook: "Notion event", agent: "agent" };

function ago(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(new Date(iso).getTime())) return "never";
  return formatRelativeTime(iso, { style: "intl" });
}

export function NotionSyncReportDialog({ report, open, onClose }: { report: NotionSyncReport | null; open: boolean; onClose: () => void }) {
  const conflicts = report?.conflicts ?? [];
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-[min(460px,96vw)] gap-3 p-4" data-notion-sync-report="">
        <DialogTitle>Notion sync</DialogTitle>
        {report ? (
          <>
            <p className="text-sm text-muted-foreground" data-notion-sync-report-when="">
              {ago(report.finished_at)} · {TRIGGER_WORDS[report.trigger ?? ""] ?? report.trigger}
            </p>
            <dl className="grid grid-cols-4 gap-2 text-center" data-notion-sync-report-counts="">
              {[
                ["Added", report.added],
                ["Updated", report.updated],
                ["Archived", report.archived],
                ["Conflicts", conflicts.length],
              ].map(([label, n]) => (
                <div key={String(label)} className="rounded-md border border-border p-2">
                  <dd className="text-lg font-semibold tabular-nums">{Number(n ?? 0)}</dd>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
            {conflicts.length ? (
              <ul className="flex flex-col gap-1 text-sm" data-notion-sync-report-conflicts="">
                {conflicts.map((c) => (
                  <li key={c.notion_id} className="rounded-md border border-border p-2">
                    <span className="font-medium">{c.title || c.notion_id}</span>
                    <span className="text-muted-foreground"> · yours kept, Notion's version is a comment on the row</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {shownNotices(report).length ? <p className="text-xs text-muted-foreground">{shownNotices(report).join(" ")}</p> : null}
          </>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" variant="quiet" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** What "Sync now" says on a table that came in from a Notion export file: nothing to sync from, and the way out. */
export const FILE_IMPORT_SYNC_SENTENCE =
  "This table was imported from a Notion file, so it has no Notion connection to sync from. Connect Notion and import it again to keep it in sync.";

/** A table the importer wrote carries its "Notion ID" key column; with no connected source it came from a file. */
export function carriesNotionKey(fields: ReadonlyArray<{ name?: string; label?: string }> | undefined | null): boolean {
  return (fields ?? []).some((f) => /^notion[ _-]?id$/i.test(String(f?.name ?? f?.label ?? "").trim()));
}

export function NotionSyncBar({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [showing, setShowing] = useState(false);
  const [was, setWas] = useState<number | null>(null);
  /** The server's "Waiting for the import of <table> to finish" while this table's own import runs. */
  const [waiting, setWaiting] = useState<string | null>(null);
  const follow = useRef<AbortController | null>(null);
  const opts = organizationId ? { organizationId } : {};
  const table = useTable(tableId);
  const fileImported = carriesNotionKey((table.data as { fields?: Array<{ name?: string; label?: string }> } | null)?.fields);

  useEffect(() => {
    let live = true;
    readNotionSyncState(tableId)
      .then((r) => live && setState(r as SyncState))
      .catch(() => live && setState({ connected: false }));
    return () => {
      live = false;
    };
  }, [tableId, organizationId]);

  /** Follow the background sync to its end, then show its report (the server saved it on the table's source). */
  const followRun = async (since: number) => {
    follow.current?.abort();
    const stop = new AbortController();
    follow.current = stop;
    const settled = await followSyncRun(tableId, { since, signal: stop.signal });
    if (!settled || stop.signal.aborted) return;
    follow.current = null;
    setWaiting(null);
    const failure = syncRunFailure(settled);
    if (failure) toast.error(failure);
    try {
      const fresh = (await readNotionSyncState(tableId)) as SyncState;
      setState(fresh);
      if (!failure) setShowing(!fresh.report?.archive_held);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
    tableShapeChanged(tableId);
  };

  // a reload mid-wait picks the wait up again: the background run is still on the table's link
  useEffect(() => {
    let live = true;
    runningSync(tableId)
      .then((op) => {
        if (!live || !op) return;
        setWaiting((now) => now ?? "Waiting for the import to finish");
        void followRun(new Date(op.created_at ?? Date.now()).getTime());
      })
      .catch(() => undefined);
    return () => {
      live = false;
      follow.current?.abort();
    };
  }, [tableId]);

  const syncNow = useCallback(async (confirmArchive?: string) => {
    setBusy(true);
    try {
      const body = confirmArchive ? { table_id: tableId, confirm_archive: confirmArchive } : { table_id: tableId };
      const pressed = Date.now();
      const { data } = await postJson<NotionSyncReport | NotionSyncWaiting, { table_id: string; confirm_archive?: string }>("/notion-import/sync", body, opts);
      if (isSyncWaiting(data)) {
        // 202: this table's own import is running; the sync runs right after it, as a background run we follow
        setWaiting(data.message);
        void followRun(pressed);
        return;
      }
      // an Archive the server answered with a different hold: say the count changed, never re-ask as if nothing happened
      setWas(confirmArchive && data.archive_held && data.archive_confirm !== confirmArchive ? Number(confirmArchive.split(":")[0]) : null);
      setState((prev) => ({ connected: true, synced_at: data.finished_at, report: { ...data, archive_kept: prev?.report?.archive_kept ?? null } }));
      tableShapeChanged(tableId);
      setShowing(!data.archive_held);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [tableId, organizationId]);

  // A held archive (the server's guard) is ONE question, asked in the strip above the grid; after Keep the chip says "N kept".
  const report = state?.connected ? (state.report ?? null) : null;
  const held = openHold(report);
  const kept = keptHold(report);
  const keep = async (token: string) => {
    if (!organizationId) return;
    try {
      await answerHold(organizationId, tableId, "keep", token);
      setState((prev) => (prev ? { ...prev, report: { ...(prev.report ?? {}), archive_kept: token } } : prev));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };
  const pending = held ?? kept;
  usePublishHeld(tableId, pending ? {
    source: "Notion", held: pending.held, confirm: pending.confirm, kept: !held, was, busy,
    onArchive: () => void syncNow(pending.confirm), onKeep: () => void keep(pending.confirm),
  } : null);

  if (state && !state.connected && fileImported) {
    return (
      <div className="flex shrink-0 items-center gap-1" data-notion-sync-bar="file-import">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button icon={<RefreshCw />} variant="quiet" aria-label="Sync now with Notion" onClick={() => toast.info(FILE_IMPORT_SYNC_SENTENCE)} data-notion-sync-now="file-import" />
          </TooltipTrigger>
          <TooltipContent>Sync now with Notion</TooltipContent>
        </Tooltip>
      </div>
    );
  }
  if (!state?.connected) return null;
  return (
    <div className="flex shrink-0 items-center gap-1" data-notion-sync-bar="">
      {!held && kept ? (
        <HeldKeptChip tableId={tableId} count={kept.held} />
      ) : (
        <Button type="button" variant="quiet" className="hidden max-w-[16rem] truncate md:inline-flex" onClick={() => setShowing(true)} title={waiting ?? undefined} data-notion-sync-when="" data-notion-sync-waiting={waiting ? "" : undefined}>
          {waiting ?? (busy ? "Syncing Notion" : `Notion synced ${ago(state.synced_at)}`)}
          {report?.conflicts?.length ? ` · ${report.conflicts.length} conflict${report.conflicts.length === 1 ? "" : "s"}` : ""}
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button icon={busy || waiting ? <Spinner size="xs" label="Syncing" /> : <RefreshCw />} variant="quiet" aria-label="Sync now with Notion" disabled={busy || Boolean(waiting)} onClick={() => void syncNow()} data-notion-sync-now="" />
        </TooltipTrigger>
        <TooltipContent>Sync now with Notion</TooltipContent>
      </Tooltip>
      <NotionSyncReportDialog report={report} open={showing} onClose={() => setShowing(false)} />
    </div>
  );
}
