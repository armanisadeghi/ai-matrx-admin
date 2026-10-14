"use client";

// Move to Trash for the conversations list, through the conversation's OWN
// delete (`softDeleteConversation` → `cx_soft_delete_conversation`): it trashes
// the messages, tool calls, artifacts, media and requests with it and clears
// every client slice holding the chat. The shared built-in trash only stamps
// the conversation row, so this list opts out of it and uses this instead.
// A provider-bound conversation is skipped and named, exactly as its row menu
// hides Delete: the coding session's binding outlives it.

import { Trash2 } from "lucide-react";
import { softDeleteConversation } from "@ai-matrx/chat/agents/redux/execution-system/message-crud/soft-delete-conversation.thunk";
import { getStore } from "@/lib/redux/store-singleton";
import { bulkCountLabel, type EntityBulkAction } from "@/lib/entity-list/selection";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import type { ConversationBrowseRow } from "./types";

export const conversationTrashBulkAction: EntityBulkAction<ConversationBrowseRow> = {
  id: "move-to-trash",
  label: "Move to Trash",
  icon: Trash2,
  variant: "destructive",
  confirm: (selection) => ({
    title: `Move ${bulkCountLabel(selection.count, "conversation")} to Trash?`,
    description: "Their messages go with them. They can be restored from Trash.",
    confirmLabel: "Move to Trash",
    variant: "destructive",
  }),
  run: (selection) =>
    runPerRow(
      selection,
      async (id) => {
        const store = getStore();
        if (!store) throw new Error("The app is still starting — try again.");
        // The chat package's thunk is typed against its own store; the app store
        // is that store plus more, so the dispatched result is read by its action shape.
        const result: unknown = await store.dispatch(
          softDeleteConversation({ conversationId: id }) as never,
        );
        if (softDeleteConversation.rejected.match(result)) {
          throw new Error(
            result.payload?.message ?? result.error.message ?? "It was not moved to Trash.",
          );
        }
      },
      {
        done: "Moved to Trash",
        noun: "conversation",
        labelOf: (row) => row.title ?? "Untitled conversation",
        removesRows: true,
        skipReason: (row) =>
          row.provider ? "linked to a coding session — open it to remove" : null,
      },
      (row) => row.id,
    ),
};
