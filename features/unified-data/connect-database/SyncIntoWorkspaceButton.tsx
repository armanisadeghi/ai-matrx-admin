"use client";

// features/unified-data/connect-database/SyncIntoWorkspaceButton.tsx — LANE SYNC-AIRTABLE (2026-10-10).
//
// Airtable's "sync a view into another base": from a table's header, pick one of its views (its
// filter and visible columns) and a destination organization the person belongs to; the store
// makes a read-only synced copy there (custom.table_copy_sync, records `tableCopySync`), read AS
// this person — the copy holds only what the view shows them. The store's time tick refreshes it
// when the source changes; rows deleted, archived or filtered out of the view are archived in it.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { createRecordsClient } from "@ai-matrx/records/core";
import { useRecordsClient } from "@ai-matrx/records/react";
import { Button, Select } from "@ai-matrx/design-system/controls";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { toast } from "@/lib/toast";

const WHOLE_TABLE = "__whole_table__";

export function SyncIntoWorkspaceButton({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const router = useRouter();
  const client = useRecordsClient();
  const { organizations } = useUserOrganizations();
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<{ value: string; label: string }[]>([{ value: WHOLE_TABLE, label: "Whole table" }]);
  const [view, setView] = useState(WHOLE_TABLE);
  const [dest, setDest] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void client.views({ table_id: tableId }).then((answer) => {
      if (!answer.ok) return;
      setViews([{ value: WHOLE_TABLE, label: "Whole table" }, ...answer.data.map((v) => ({ value: v.view_id, label: v.name }))]);
    });
  }, [client, open, tableId]);

  const orgOptions = organizations.map((o) => ({ value: o.id, label: o.name }));
  const destination = dest || organizationId || orgOptions[0]?.value || "";
  const sourceOrg = organizationId ?? client.config.organizationId;

  async function sync() {
    if (!destination || !sourceOrg) return;
    setBusy(true);
    const there = createRecordsClient({ ...client.config, organizationId: destination });
    const done = await there.tableCopySync({
      source_organization_id: sourceOrg,
      source_table_id: tableId,
      view_id: view === WHOLE_TABLE ? null : view,
    });
    setBusy(false);
    if (!done.ok) {
      toast.error(done.error.message);
      return;
    }
    setOpen(false);
    toast.success(`Synced ${done.data.rows_total ?? done.data.rows_inserted} rows`);
    router.push(`/data/${done.data.table_id}`);
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button icon={<ArrowRightLeft />} variant="quiet" aria-label="Sync into another workspace" onClick={() => setOpen(true)} data-sync-into-workspace="" />
        </TooltipTrigger>
        <TooltipContent>Sync into another workspace</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sync into another workspace</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3" data-sync-into-workspace-form="">
            <label className="flex flex-col gap-1 text-sm">
              View
              <Select<string> aria-label="View" value={view} options={views} onValueChange={setView} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Workspace
              <Select<string> aria-label="Workspace" value={destination} options={orgOptions} onValueChange={setDest} />
            </label>
            <p className="text-xs text-muted-foreground">A read-only copy that follows this view</p>
            <div className="flex justify-end">
              <Button
                icon={busy ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRightLeft aria-hidden />}
                variant="primary"
                disabled={!destination || busy}
                onClick={() => void sync()}
                data-sync-into-workspace-submit=""
              >
                Sync
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
