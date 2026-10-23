// features/product-capture/components/allItemsBulkActions.ts — THE BULK TWIN RULE for /tools/product-capture/all.
//
// The row's verbs are View, Capture more (both open a page: single), Mark ready / Reprocess and Delete.
// Mark ready / Reprocess and Delete work on the TICKED items too, through the same doors the row calls
// (`closeItem`, `deleteItem`); an item the verb does not fit is skipped and named.

import { CheckCircle2, RefreshCw, Trash2 } from "lucide-react";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { deleteItem, handOffItem } from "../service";
import type { CaptureItem } from "../types";

/** The least an items-table row carries for these verbs. */
export interface ItemBulkRow {
  id: string;
  code: string | null;
  status: string;
  item: CaptureItem;
}

export const ITEM_VERBS = [
  { id: "mark-ready", label: "Mark ready", icon: CheckCircle2 },
  { id: "reprocess", label: "Reprocess", icon: RefreshCw },
  { id: "delete", label: "Delete", icon: Trash2, danger: true },
] as const;

export function itemBulkActions(
  onSaved: (id: string, saved: CaptureItem) => void,
  onDeleted: (id: string) => void,
): EntityBulkAction<ItemBulkRow>[] {
  // Flipping into `captured` IS the workflow handoff (the DB transition fires the
  // trigger): closeItem for a capturing item, reprocessItem for a settled one.
  const close = async (id: string, row: ItemBulkRow | undefined) => {
    if (!row) throw new Error("The item is no longer listed");
    onSaved(id, await handOffItem(row.item));
  };
  return bulkActionsFromRowVerbs(
    ITEM_VERBS,
    {
      "mark-ready": {
        done: "Marked ready",
        skipReason: (row) => (row.status === "capturing" ? null : row.status === "processed" ? "Already processed — use Reprocess" : "Already ready"),
        runOne: close,
      },
      reprocess: {
        done: "Queued for reprocessing",
        skipReason: (row) => (row.status === "processed" ? null : "Not processed yet"),
        runOne: close,
      },
      delete: {
        done: "Deleted",
        removesRows: true,
        confirm: (t) => ({
          title: `Delete ${t.ids.length} ${t.ids.length === 1 ? "item" : "items"}?`,
          description: "They are removed from the capture list. Uploaded files stay in your organization's file tree.",
          confirmLabel: "Delete",
          variant: "destructive",
        }),
        runOne: async (id) => {
          await deleteItem(id);
          onDeleted(id);
        },
      },
    },
    { noun: "item", getRowId: (row) => row.id, getRowName: (row) => row.code ?? "No code" },
  );
}
