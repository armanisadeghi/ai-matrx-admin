"use client";

/**
 * The Workbooks home's "From a table" tile (Google Sheets has no twin): pick one of the person's
 * tables and open it as a linked workbook — the same door as a table page's "Open as workbook"
 * (`openTableAsWorkbook`).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Table2 } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { Button } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { DataTablePicker } from "@/features/start/widgets/DataPagePicker";
import { StartTile } from "@/features/file-actions/home/StartBand";
import { openTableAsWorkbook } from "@/features/workbooks/table-link/link-service";

export function FromTableTile() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tableId, setTableId] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!tableId) return;
    setBusy(true);
    const made = await openTableAsWorkbook(tableId);
    setBusy(false);
    if (!made.ok) {
      toast.error(made.error);
      return;
    }
    setOpen(false);
    router.push(made.data.href);
  };

  return (
    <>
      <StartTile
        label="From a table"
        title="Open one of your tables as a linked workbook"
        onClick={() => setOpen(true)}
        face={<Table2 className="size-10 stroke-[1.25] text-success" aria-hidden />}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a table as a workbook</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <DataTablePicker value={tableId} onChange={setTableId} />
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!tableId || busy}
                icon={busy ? <Spinner size="xs" label="Opening" /> : undefined}
                onClick={() => void go()}
              >
                Open
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
