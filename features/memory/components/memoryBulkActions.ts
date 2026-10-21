// features/memory/components/memoryBulkActions.ts — THE BULK TWIN RULE for /memory/agent-memory.
//
// The detail pane's trash button (Move to Trash) works on the TICKED files too, through the same door
// (`deleteMemory`, a soft delete restorable from Trash). Save and New are single-file edits.

import { Trash2 } from "lucide-react";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { deleteMemory, type MemoryEntry } from "../service/memoryService";

export const MEMORY_VERBS = [{ id: "move-to-trash", label: "Move to Trash", icon: Trash2, danger: true }] as const;

export function memoryBulkActions(onDeleted: (paths: string[]) => void): EntityBulkAction<MemoryEntry>[] {
  return bulkActionsFromRowVerbs(
    MEMORY_VERBS,
    {
      "move-to-trash": {
        done: "Moved to Trash",
        removesRows: true,
        confirm: (t) => ({
          title: `Move ${t.ids.length} memory ${t.ids.length === 1 ? "file" : "files"} to Trash?`,
          description: "They are removed from your agent memory in every sandbox. Restore them from Trash.",
          confirmLabel: "Move to Trash",
          variant: "destructive",
        }),
        runOne: async (path) => {
          await deleteMemory(path);
          onDeleted([path]);
        },
      },
    },
    { noun: "memory file", getRowId: (entry) => entry.path, getRowName: (entry) => entry.path },
  );
}
