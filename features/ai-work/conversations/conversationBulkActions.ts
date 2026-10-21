// features/ai-work/conversations/conversationBulkActions.ts — THE BULK TWIN RULE for /work/conversations.
//
// The row menu is the chat package's one `buildConversationMenu`. Its mutating verbs (Archive / Unarchive,
// Exclude from / Include in the knowledge graph, Add to project, Delete) work on a SELECTION too, through
// the SAME thunks and association door the row calls:
//   Archive / Unarchive          setConversationArchived        (one row at a time, refusals named)
//   Exclude / Include in the KG  setConversationExcludeFromKg
//   Add to project…              the association picker (opened by the row-actions hook) → store.add per row
//   Move to Trash                ./bulkTrash.ts (the conversation's own cascade)
// Pin / Unpin come from the shell's built-in Favorite. Rename, Open in new tab, Copy link, Duplicate, Share
// and Make an agent are one-conversation verbs (they open a dialog or a new page for that conversation).

import { Archive, ArchiveRestore, Eye, EyeOff, FolderKanban } from "lucide-react";
import {
  setConversationArchived,
  setConversationExcludeFromKg,
} from "@ai-matrx/chat/agents/redux/conversation-list/conversation-row-actions.thunks";
import { getStore } from "@/lib/redux/store-singleton";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import type { ConversationBrowseRow } from "./types";

/** Every conversation verb a person can do from a row menu that changes something. */
export const CONVERSATION_BULK_VERBS = [
  { id: "archive", label: "Archive", icon: Archive },
  { id: "unarchive", label: "Unarchive", icon: ArchiveRestore },
  { id: "exclude-kg", label: "Exclude from knowledge graph", icon: EyeOff },
  { id: "include-kg", label: "Include in knowledge graph", icon: Eye },
  { id: "add-to-project", label: "Add to project…", icon: FolderKanban },
] as const;

type Listener = (rows: ConversationBrowseRow[]) => void;
const projectAsks = new Set<Listener>();

/** The row-actions hook (which owns the project picker) listens here. */
export function onBulkProjectAsked(listener: Listener): () => void {
  projectAsks.add(listener);
  return () => {
    projectAsks.delete(listener);
  };
}

/** Ask the mounted list to open its project picker for these conversations. */
export function askBulkProject(rows: ConversationBrowseRow[]): boolean {
  if (projectAsks.size === 0) return false;
  for (const listener of projectAsks) listener(rows);
  return true;
}

async function dispatchThunk(action: unknown, rejected: { match: (a: unknown) => boolean }): Promise<void> {
  const store = getStore();
  if (!store) throw new Error("The app is still starting — try again.");
  const result: unknown = await store.dispatch(action as never);
  if (rejected.match(result)) {
    const r = result as { payload?: { message?: string }; error?: { message?: string } };
    throw new Error(r.payload?.message ?? r.error?.message ?? "It did not go through.");
  }
}

export const conversationBulkActions: EntityBulkAction<ConversationBrowseRow>[] = bulkActionsFromRowVerbs(
  CONVERSATION_BULK_VERBS,
  {
    archive: {
      done: "Archived",
      skipReason: (row) => (row.is_archived ? "Already archived" : null),
      runOne: (id) => dispatchThunk(setConversationArchived({ conversationId: id, archived: true }), setConversationArchived.rejected),
    },
    unarchive: {
      done: "Unarchived",
      skipReason: (row) => (row.is_archived ? null : "Not archived"),
      runOne: (id) => dispatchThunk(setConversationArchived({ conversationId: id, archived: false }), setConversationArchived.rejected),
    },
    "exclude-kg": {
      done: "Excluded from the knowledge graph",
      runOne: (id) =>
        dispatchThunk(setConversationExcludeFromKg({ conversationId: id, excludeFromKg: true }), setConversationExcludeFromKg.rejected),
    },
    "include-kg": {
      done: "Included in the knowledge graph",
      runOne: (id) =>
        dispatchThunk(setConversationExcludeFromKg({ conversationId: id, excludeFromKg: false }), setConversationExcludeFromKg.rejected),
    },
    "add-to-project": {
      done: "Added to the project",
      // The picker is the person's choice of project; it files the rows itself (the hook), so nothing
      // ran here and the selection stays until it does.
      run: async (targets) => {
        if (!askBulkProject(targets.rows)) throw new Error("The project picker is not ready — try again.");
        return undefined;
      },
    },
  },
  {
    noun: "conversation",
    getRowId: (row) => row.id,
    getRowName: (row) => row.title ?? "Untitled conversation",
  },
);
