// features/messaging/lib/conversationBulkActions.ts — THE BULK TWIN RULE for the /messages list.
//
// The conversation row's menu (`buildConversationMenuSection`) can Mark read, Mark unread, Mute / Unmute,
// Archive / Unarchive and Pin / Unpin. The same verbs work on the TICKED conversations, through the same
// engine row actions the menu calls (`useConversations()`); a conversation already in the wanted state is
// skipped and named. Open, Open in a new tab, Copy link and Attach To are one-conversation verbs.

import type { ConversationSummary } from "@ai-matrx/messaging";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { favoritesService } from "@/features/scopes/service/favoritesService";
import { conversationTitle } from "./messaging-menu-actions";
import { CONVERSATION_VERBS } from "./conversationVerbs";

export { CONVERSATION_VERBS };

export interface ConversationBulkDeps {
  markRead: (id: string) => void | Promise<void>;
  markUnread: (id: string) => void | Promise<void>;
  setMuted: (id: string, muted: boolean) => void | Promise<void>;
  setArchived: (id: string, archived: boolean) => void | Promise<void>;
  pins: readonly string[];
}

/** Pin or unpin one conversation through the pin store's own door, then tell the pane's pins to read again. */
async function setPinned(id: string, pinned: boolean): Promise<void> {
  const result = await favoritesService.setPinned("dm_conversation", id, pinned);
  if (!result.ok) throw new Error(result.error.message);
  window.dispatchEvent(new Event("messages-pins-changed"));
}

const idOf = (row: ConversationSummary) => row.conversation.id;

export function conversationBulkActions(deps: ConversationBulkDeps): EntityBulkAction<ConversationSummary>[] {
  const pinned = (row: ConversationSummary) => deps.pins.includes(idOf(row));
  return bulkActionsFromRowVerbs(
    CONVERSATION_VERBS,
    {
      "mark-read": {
        done: "Marked read",
        runOne: async (id) => deps.markRead(id),
      },
      "mark-unread": {
        done: "Marked unread",
        runOne: async (id) => deps.markUnread(id),
      },
      mute: {
        done: "Muted",
        runOne: async (id) => deps.setMuted(id, true),
      },
      unmute: {
        done: "Unmuted",
        runOne: async (id) => deps.setMuted(id, false),
      },
      archive: {
        done: "Archived",
        runOne: async (id) => deps.setArchived(id, true),
      },
      unarchive: {
        done: "Unarchived",
        runOne: async (id) => deps.setArchived(id, false),
      },
      pin: {
        done: "Pinned",
        runOne: (id) => setPinned(id, true),
      },
      unpin: {
        done: "Unpinned",
        runOne: (id) => setPinned(id, false),
      },
    },
    {
      noun: "conversation",
      getRowId: idOf,
      getRowName: conversationTitle,
      // The one rule, shared with the row menu: a row the verb does not fit is skipped and named.
      blocked: (verb, row) => verb.skip(row, { isPinned: pinned(row) }),
    },
  );
}
