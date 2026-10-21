// features/messaging/lib/conversationBulkActions.ts — THE BULK TWIN RULE for the /messages list.
//
// The conversation row's menu (`buildConversationMenuSection`) can Mark read, Mark unread, Mute / Unmute,
// Archive / Unarchive and Pin / Unpin. The same verbs work on the TICKED conversations, through the same
// engine row actions the menu calls (`useConversations()`); a conversation already in the wanted state is
// skipped and named. Open, Open in a new tab, Copy link and Attach To are one-conversation verbs.

import { Archive, ArchiveRestore, Bell, BellOff, Mail, MailOpen, Pin, PinOff } from "lucide-react";
import type { ConversationSummary } from "@ai-matrx/messaging";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { favoritesService } from "@/features/scopes/service/favoritesService";
import { conversationTitle } from "./messaging-menu-actions";

export const CONVERSATION_VERBS = [
  { id: "mark-read", label: "Mark read", icon: MailOpen },
  { id: "mark-unread", label: "Mark unread", icon: Mail },
  { id: "mute", label: "Mute", icon: BellOff },
  { id: "unmute", label: "Unmute", icon: Bell },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "unarchive", label: "Unarchive", icon: ArchiveRestore },
  { id: "pin", label: "Pin", icon: Pin },
  { id: "unpin", label: "Unpin", icon: PinOff },
] as const;

export interface ConversationBulkDeps {
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  setMuted: (id: string, muted: boolean) => void;
  setArchived: (id: string, archived: boolean) => void;
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
        skipReason: (row) => (row.unreadCount > 0 ? null : "Already read"),
        runOne: async (id) => deps.markRead(id),
      },
      "mark-unread": {
        done: "Marked unread",
        skipReason: (row) => (row.unreadCount > 0 ? "Already unread" : null),
        runOne: async (id) => deps.markUnread(id),
      },
      mute: {
        done: "Muted",
        skipReason: (row) => (row.isMuted ? "Already muted" : null),
        runOne: async (id) => deps.setMuted(id, true),
      },
      unmute: {
        done: "Unmuted",
        skipReason: (row) => (row.isMuted ? null : "Not muted"),
        runOne: async (id) => deps.setMuted(id, false),
      },
      archive: {
        done: "Archived",
        skipReason: (row) => (row.isArchived ? "Already archived" : null),
        runOne: async (id) => deps.setArchived(id, true),
      },
      unarchive: {
        done: "Unarchived",
        skipReason: (row) => (row.isArchived ? null : "Not archived"),
        runOne: async (id) => deps.setArchived(id, false),
      },
      pin: {
        done: "Pinned",
        skipReason: (row) => (pinned(row) ? "Already pinned" : null),
        runOne: (id) => setPinned(id, true),
      },
      unpin: {
        done: "Unpinned",
        skipReason: (row) => (pinned(row) ? null : "Not pinned"),
        runOne: (id) => setPinned(id, false),
      },
    },
    { noun: "conversation", getRowId: idOf, getRowName: conversationTitle },
  );
}
