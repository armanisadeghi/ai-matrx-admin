"use client";

/**
 * The table page's side of the workbook link: "Open as workbook" makes a linked workbook from the
 * table; once linked, the menu names the workbook, when it last synced, and opens it to Update the
 * table from it or Refresh it from the table (the preview runs in the workbook, where the sheet
 * lives — one apply path).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { FileSpreadsheet, Loader2, Plus, RefreshCw, Upload } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/toast";

import { openTableAsWorkbook, workbooksLinkedTo, type LinkedWorkbook } from "./link-service";

export function TableWorkbookLinkButton({ tableId }: { tableId: string }) {
  const router = useRouter();
  const [linked, setLinked] = useState<LinkedWorkbook[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void workbooksLinkedTo(tableId).then((r) => {
      if (cancelled) return;
      if (!r.ok) toast.error(`Linked workbooks: ${r.error}`);
      setLinked(r.ok ? r.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [tableId]);

  const openNew = async () => {
    setBusy(true);
    const made = await openTableAsWorkbook(tableId);
    setBusy(false);
    if (!made.ok) {
      toast.error(made.error);
      return;
    }
    router.push(made.data.href);
  };

  if (linked === null) return null;
  const icon = busy ? <Loader2 className="animate-spin" aria-hidden /> : <FileSpreadsheet aria-hidden />;

  if (linked.length === 0) {
    return (
      <Button variant="quiet" icon={icon} disabled={busy} onClick={() => void openNew()} title="Open as a linked workbook" aria-label="Open as workbook" data-table-open-as-workbook="" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" icon={icon} disabled={busy} aria-label="Linked workbook" title="Linked workbook" data-table-workbook-link="" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {linked.map(({ workbookId, name, link }) => (
          <div key={`${workbookId}-${link.sheet_id}`}>
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="truncate text-sm">{name}</span>
              <span className="text-xs text-muted-foreground">
                {link.last_synced_at ? `Synced ${formatDistanceToNow(new Date(link.last_synced_at), { addSuffix: true })}` : "Not synced yet"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => router.push(`/workbooks/${workbookId}`)}>
              <FileSpreadsheet className="size-4" aria-hidden /> Open workbook
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push(`/workbooks/${workbookId}?tableSync=update`)} data-table-update-from-workbook="">
              <Upload className="size-4" aria-hidden /> Update from workbook
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push(`/workbooks/${workbookId}?tableSync=refresh`)} data-table-refresh-workbook="">
              <RefreshCw className="size-4" aria-hidden /> Refresh workbook
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </div>
        ))}
        <DropdownMenuItem onSelect={() => void openNew()}>
          <Plus className="size-4" aria-hidden /> Open as new workbook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
