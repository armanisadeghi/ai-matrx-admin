"use client";

// features/unified-data/base/SheetsImportDialog.tsx — a Google Sheet brought in ONCE as a new ordinary table. Lane AT-BASE.
// A link shared "anyone with the link" (POST /synced-tables/import-once), or a sheet of a connected Google account
// (POST /google-sync/sheets/import {one_time}). Nothing keeps either in step; the sync path stays where it was.

import { Button, Field } from "@ai-matrx/design-system/controls";
import Link from "next/link";
import { useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { postJson } from "@/lib/python-client";
import { ErrorNotice } from "@ai-matrx/design-system";
import { sayError } from "./sayError";

export function SheetsImportDialog({ open, onClose, organizationId }: { open: boolean; onClose: () => void; organizationId: string }) {
  const [mode, setMode] = useState<"link" | "account">("link");
  const [url, setUrl] = useState("");
  const [fileId, setFileId] = useState("");
  const [tab, setTab] = useState("");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ tableId: string; rows: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const go = async () => {
    setBusy(true); setProblem(null);
    try {
      if (mode === "link") {
        const { data } = await postJson<{ table_id: string; rows_total: number }>("/synced-tables/import-once", { organization_id: organizationId, url: url.trim() }, { organizationId });
        setMade({ tableId: data.table_id, rows: data.rows_total });
      } else {
        const { data } = await postJson<{ table_id: string | null; row_count: number }>("/google-sync/sheets/import",
          { organization_id: organizationId, file_id: fileId.trim(), tab: tab.trim() || null, one_time: true }, { organizationId });
        if (!data.table_id) throw new Error("The sheet was read but no table was made.");
        setMade({ tableId: data.table_id, rows: data.row_count });
      }
    } catch (e) { setProblem(sayError(e, "The sheet could not be brought in.")); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-w-[min(560px,96vw)] gap-3 p-4" data-sheets-import="">
        <DialogTitle>Bring in a Google Sheet once</DialogTitle>
        {made ? (
          <div className="flex flex-col gap-2 text-sm" data-sheets-done="">
            <p>{made.rows} rows are now a table of their own. Nothing keeps it in step with the sheet.</p>
            <div className="flex justify-end gap-2"><Button variant="quiet" onClick={onClose}>Close</Button><Link href={`/data/${made.tableId}`}><Button variant="primary">Open the table</Button></Link></div>
          </div>
        ) : (
          <>
            <div className="flex gap-2" role="tablist">
              <Button variant={mode === "link" ? "primary" : "quiet"} onClick={() => setMode("link")} data-sheets-mode="link">From a link</Button>
              <Button variant={mode === "account" ? "primary" : "quiet"} onClick={() => setMode("account")} data-sheets-mode="account">From my Google account</Button>
            </div>
            {mode === "link" ? (
              <Field autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Google Sheets link (shared with anyone who has the link)" aria-label="Google Sheets link" />
            ) : (
              <>
                <Field value={fileId} onChange={(e) => setFileId(e.target.value)} placeholder="Sheet picked from your connected Google account (file id)" aria-label="Sheet file id" />
                <Field value={tab} onChange={(e) => setTab(e.target.value)} placeholder="Tab name (first tab if empty)" aria-label="Tab" />
                <p className="text-xs text-muted-foreground">Pick the sheet in Settings → Connections → Google; its file id lands here.</p>
              </>
            )}
            {problem ? <ErrorNotice message={problem} size="inline" /> : null}
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="primary" disabled={busy || !(mode === "link" ? url.trim() : fileId.trim())} onClick={() => void go()} data-sheets-go="">{busy ? "Bringing it in…" : "Bring it in"}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
