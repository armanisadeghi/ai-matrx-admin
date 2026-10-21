// features/ai-work/compose/components/savedRequestsBulkActions.ts — THE BULK TWIN RULE for /work/requests.
//
// A saved request's row verbs are Open (the composer with it loaded) and Delete. Delete works on the TICKED
// requests too, through the same door (`deleteSavedRequest`), naming each one that refused.

import { Trash2 } from "lucide-react";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { deleteSavedRequest, type SavedRequest } from "../savedRequests";

export const SAVED_REQUEST_VERBS = [{ id: "delete", label: "Delete", icon: Trash2, danger: true }] as const;

export function savedRequestBulkActions(): EntityBulkAction<SavedRequest>[] {
  return bulkActionsFromRowVerbs(
    SAVED_REQUEST_VERBS,
    {
      delete: {
        done: "Deleted",
        removesRows: true,
        confirm: (t) => ({
          title: `Delete ${t.ids.length} saved ${t.ids.length === 1 ? "request" : "requests"}?`,
          description: "They are removed from your saved requests for good.",
          confirmLabel: "Delete",
          variant: "destructive",
        }),
        runOne: (id) => deleteSavedRequest(id),
      },
    },
    { noun: "saved request", getRowId: (row) => row.id, getRowName: (row) => row.label },
  );
}
