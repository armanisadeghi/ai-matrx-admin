// features/messaging/lib/conversationVerbs.ts — THE ONE LIST of per-conversation state verbs.
// The row menu (`buildConversationMenuSection`) and the bulk bar (`conversationBulkActions`) both read
// it: a verb added here shows on both, and `skip` is the single rule for "does this apply to that row".

import { Archive, ArchiveRestore, Bell, BellOff, Mail, MailOpen, Pin, PinOff } from "lucide-react";
import type { ConversationSummary } from "@ai-matrx/messaging";

export interface ConversationVerbContext {
  isPinned: boolean;
}

export const CONVERSATION_VERBS = [
  { id: "mark-read", label: "Mark read", icon: MailOpen, skip: (r: ConversationSummary) => (r.unreadCount > 0 ? null : "Already read") },
  { id: "mark-unread", label: "Mark unread", icon: Mail, skip: (r: ConversationSummary) => (r.unreadCount > 0 ? "Already unread" : null) },
  { id: "mute", label: "Mute", icon: BellOff, skip: (r: ConversationSummary) => (r.isMuted ? "Already muted" : null) },
  { id: "unmute", label: "Unmute", icon: Bell, skip: (r: ConversationSummary) => (r.isMuted ? null : "Not muted") },
  { id: "archive", label: "Archive", icon: Archive, skip: (r: ConversationSummary) => (r.isArchived ? "Already archived" : null) },
  { id: "unarchive", label: "Unarchive", icon: ArchiveRestore, skip: (r: ConversationSummary) => (r.isArchived ? null : "Not archived") },
  { id: "pin", label: "Pin", icon: Pin, skip: (_r: ConversationSummary, c: ConversationVerbContext) => (c.isPinned ? "Already pinned" : null) },
  { id: "unpin", label: "Unpin", icon: PinOff, skip: (_r: ConversationSummary, c: ConversationVerbContext) => (c.isPinned ? null : "Not pinned") },
] as const;

export type ConversationVerbId = (typeof CONVERSATION_VERBS)[number]["id"];
