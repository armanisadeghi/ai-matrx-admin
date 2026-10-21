// features/agents/term-lists/components/termListBulkActions.ts — THE BULK TWIN RULE for /resources/term-lists.
//
// The editor's Archive works on the TICKED term lists of the rail too, through the same door
// (`archiveTermList`); each one that refuses is named. Save / New are single-list edits.

import { Archive } from "lucide-react";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { archiveTermList } from "../service";
import type { TermList } from "../types";

export const TERM_LIST_VERBS = [{ id: "archive", label: "Archive", icon: Archive, danger: true }] as const;

export function termListBulkActions(): EntityBulkAction<TermList>[] {
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
    },
    { noun: "term list", getRowId: (row) => row.id, getRowName: (row) => row.name },
  );
}
