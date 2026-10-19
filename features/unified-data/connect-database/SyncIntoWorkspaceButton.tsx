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
import { OrganizationChooser } from "@/features/organizations/components/OrganizationChooser";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { toast } from "@/lib/toast";

const WHOLE_TABLE = "__whole_table__";

export function SyncIntoWorkspaceButton({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const router = useRouter();
  const client = useRecordsClient();
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<{ value: string; label: string }[]>([{ value: WHOLE_TABLE, label: "Whole table" }]);
  const [view, setView] = useState(WHOLE_TABLE);
  const [dest, setDest] = useState<string>("");
  const [busy, setBusy] = useState(false);
  // The destination has no data home: said IN the dialog (a toast leaves and the dialog gives no hint what to do), and the
  // dialog stays ready for a retry the moment the person has opened that workspace's Data page once.
  const [noHome, setNoHome] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void client.views({ table_id: tableId }).then((answer) => {
      if (!answer.ok) return;
      setViews([{ value: WHOLE_TABLE, label: "Whole table" }, ...answer.data.map((v) => ({ value: v.view_id, label: v.name }))]);
    });
  }, [client, open, tableId]);

  const sourceOrg = organizationId ?? client.config.organizationId;
  // NO SILENT DEFAULT: nothing is picked until the person picks. Other workspaces come first; this
  // table's own workspace is offered last, named as such, for a deliberate same-workspace copy.
  const orgOptions = [
    { value: "", label: "Pick a workspace" },
  ];
  const destination = dest;

  async function sync() {
    if (!destination || !sourceOrg) return;
    setBusy(true);
    setNoHome(null);
    const there = createRecordsClient({ ...client.config, organizationId: destination });
    const done = await there.tableCopySync({
      source_organization_id: sourceOrg,
      source_table_id: tableId,
      view_id: view === WHOLE_TABLE ? null : view,
    });
    setBusy(false);
    if (!done.ok) {
      if (/data home/i.test(done.error.message)) setNoHome(done.error.message);
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
              <OrganizationChooser value={destination || null} placeholder="Pick a workspace" onChange={(org) => {
                  setDest(org.id);
                  setNoHome(null);
                }} className="w-full justify-start" />
            </label>
            {noHome ? (
              <p className="text-xs text-destructive" role="alert" data-sync-into-workspace-no-home="">
                {noHome} Then press Sync again.
                <ErrorAlchemyMenu error={noHome} />
              </p>
            ) : null}
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
