// features/google-workspace/gmailBulkActions.ts — THE BULK TWIN RULE for /gmail-read-review.
//
// The open message's buttons (Archive, Mark read, Mark unread, Star, Remove star, Restore to inbox) work on
// the TICKED search results too. Each is declared once in GMAIL_VERBS and its twin calls the same door the
// button calls (`modifyGmailMessage`), one message at a time (5 at once), naming each refusal. Gmail label
// add / remove needs a loaded label list and one open message, so it stays a single-message verb.

import { Archive, Inbox, Mail, MailOpen, Star, StarOff } from "lucide-react";
import { modifyGmailMessage } from "@/features/marketing/google/service";
import type { GmailMessageSummary, GmailModifyAction } from "@/features/marketing/google/types";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";

export const GMAIL_VERBS = [
  { id: "archive", label: "Archive", icon: Archive },
  { id: "restore_inbox", label: "Restore to inbox", icon: Inbox },
  { id: "mark_read", label: "Mark read", icon: MailOpen },
  { id: "mark_unread", label: "Mark unread", icon: Mail },
  { id: "star", label: "Star", icon: Star },
  { id: "unstar", label: "Remove star", icon: StarOff },
] as const;

/** The label whose presence each action flips, so a message already in the wanted state is skipped and named. */
const FLIPS: Record<Exclude<GmailModifyAction, "add_label" | "remove_label">, { label: string; wantPresent: boolean; why: string }> = {
  archive: { label: "INBOX", wantPresent: false, why: "Not in the inbox" },
  restore_inbox: { label: "INBOX", wantPresent: true, why: "Already in the inbox" },
  mark_read: { label: "UNREAD", wantPresent: false, why: "Already read" },
  mark_unread: { label: "UNREAD", wantPresent: true, why: "Already unread" },
  star: { label: "STARRED", wantPresent: true, why: "Already starred" },
  unstar: { label: "STARRED", wantPresent: false, why: "Not starred" },
};

/** Why this message is skipped for the action, or null. A result with no label list is never skipped. */
export function gmailSkip(action: keyof typeof FLIPS, row: GmailMessageSummary): string | null {
  const flip = FLIPS[action];
  if (!row.label_ids) return null;
  return row.label_ids.includes(flip.label) === flip.wantPresent ? flip.why : null;
}

export function gmailBulkActions(connectionId: string, onChanged: (messageId: string, labelIds: string[]) => void): EntityBulkAction<GmailMessageSummary>[] {
  const twin = (action: keyof typeof FLIPS, done: string) => ({
    done,
    skipReason: (row: GmailMessageSummary) => gmailSkip(action, row),
    runOne: async (id: string) => {
      const updated = await modifyGmailMessage({ connectionId, messageId: id, action });
      if (updated.message_id !== id || !Array.isArray(updated.label_ids)) {
        throw new Error("Gmail did not confirm the change");
      }
      onChanged(id, updated.label_ids);
    },
  });
  return bulkActionsFromRowVerbs(
    GMAIL_VERBS,
    {
      archive: twin("archive", "Archived"),
      restore_inbox: twin("restore_inbox", "Restored to inbox"),
      mark_read: twin("mark_read", "Marked read"),
      mark_unread: twin("mark_unread", "Marked unread"),
      star: twin("star", "Starred"),
      unstar: twin("unstar", "Removed star"),
    },
    { noun: "message", getRowId: (row) => row.id, getRowName: (row) => row.subject || "(no subject)" },
  );
}
