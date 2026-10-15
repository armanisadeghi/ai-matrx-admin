"use client";

// features/spaces/io/NotionSyncBar.tsx — LANE NOTION-SYNC. A table brought in from a connected Notion
// remembers its Notion database (aidream users.notion_sync_source): this is its header chip, its
// "Sync now" and the sync report (last run, rows added / updated / archived, conflicts).
// Absent on any table that did not come from a connected Notion. Event-driven: a press here, the agent
// action `notion_sync`, or Notion's signed webhook — never a schedule.

import { Button } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { tableShapeChanged } from "@ai-matrx/records/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getJson, postJson } from "@/lib/python-client";
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
            {report.notices?.length ? <p className="text-xs text-muted-foreground">{report.notices.join(" ")}</p> : null}
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

export function NotionSyncBar({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [showing, setShowing] = useState(false);
  const opts = organizationId ? { organizationId } : {};

  useEffect(() => {
    let live = true;
    getJson<SyncState>(`/notion-import/sync?table_id=${encodeURIComponent(tableId)}`, { ...opts, captureErrors: false })
      .then((r) => live && setState(r.data))
      .catch(() => live && setState({ connected: false }));
    return () => {
      live = false;
    };
  }, [tableId, organizationId]);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await postJson<NotionSyncReport, { table_id: string }>("/notion-import/sync", { table_id: tableId }, opts);
      setState({ connected: true, synced_at: data.finished_at, report: data });
      tableShapeChanged(tableId);
      setShowing(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [tableId, organizationId]);

  if (!state?.connected) return null;
  const report = state.report ?? null;
  return (
    <div className="flex shrink-0 items-center gap-1" data-notion-sync-bar="">
      <Button type="button" variant="quiet" className="hidden max-w-[16rem] truncate md:inline-flex" onClick={() => setShowing(true)} data-notion-sync-when="">
        {busy ? "Syncing Notion" : `Notion synced ${ago(state.synced_at)}`}
        {report?.conflicts?.length ? ` · ${report.conflicts.length} conflict${report.conflicts.length === 1 ? "" : "s"}` : ""}
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button icon={<RefreshCw className={busy ? "animate-spin" : undefined} />} variant="quiet" aria-label="Sync now with Notion" disabled={busy} onClick={() => void syncNow()} data-notion-sync-now="" />
        </TooltipTrigger>
        <TooltipContent>Sync now with Notion</TooltipContent>
      </Tooltip>
      <NotionSyncReportDialog report={report} open={showing} onClose={() => setShowing(false)} />
    </div>
  );
}
