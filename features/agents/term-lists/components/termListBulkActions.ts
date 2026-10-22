// features/agents/term-lists/components/termListBulkActions.ts — THE BULK TWIN RULE for /resources/term-lists.
//
// The editor's Archive works on the TICKED term lists of the rail too, through the same door
// (`archiveTermList`); each one that refuses is named. Restore is the archived list's verb, on a
// row and on the ticked archived lists, through `restoreTermList` (the platform's undelete door).
// Save / New are single-list edits.

import { Archive, ArchiveRestore } from "lucide-react";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { archiveTermList, restoreTermList } from "../service";
import type { TermList } from "../types";

export const TERM_LIST_VERBS = [
  { id: "archive", label: "Archive", icon: Archive, danger: true },
  { id: "restore", label: "Restore", icon: ArchiveRestore },
] as const;

const TERM_LIST_BULK_CONTEXT = {
  noun: "term list",
  getRowId: (row: TermList) => row.id,
  getRowName: (row: TermList) => row.name,
};

/** Which rail section the ticked lists are in: live lists archive, archived lists restore. */
export type TermListView = "active" | "archived";

export function termListBulkActions(view: TermListView = "active"): EntityBulkAction<TermList>[] {
  return bulkActionsFromRowVerbs(
    TERM_LIST_VERBS,
    {
      archive: {
        done: "Archived",
        removesRows: true,
        confirm: (t) => ({
          title: `Archive ${t.ids.length} term ${t.ids.length === 1 ? "list" : "lists"}?`,
          description: "Every agent using them stops receiving these terms on its next run.",
          confirmLabel: "Archive",
          variant: "destructive",
        }),
        runOne: (id) => archiveTermList(id),
      },
      restore: {
        done: "Restored",
        removesRows: true,
        runOne: (id) => restoreTermList(id),
      },
    },
    {
      ...TERM_LIST_BULK_CONTEXT,
      blocked: (verb) =>
        verb.id === "archive" && view === "archived"
          ? "Already archived"
          : verb.id === "restore" && view === "active"
            ? "Not archived"
            : null,
    },
  ).filter((a) => (view === "archived" ? a.id === "restore" : a.id === "archive"));
}
