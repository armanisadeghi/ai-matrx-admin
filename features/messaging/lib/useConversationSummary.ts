"use client";

/**
 * 🚨 A CONVERSATION'S NAME COMES FROM ITS SUMMARY, NEVER FROM THE VISIBLE LIST PAGE (2026-10-15).
 *
 * The thread header looked the open conversation up in `useConversations().conversations` — the
 * list as currently FILTERED (People | Agents | All, Unread, archived) and PAGED. Open an agent
 * room, switch the list to People, and the room is no longer in that array: the header fell back
 * to "Conversation" while its real name sat in the store. The same happened to any deep-linked
 * thread outside the first page.
 *
 * The engine keeps every summary it has ever read in `conversationSummaries`, whatever the list
 * shows, and opening a thread hydrates a summary the list never carried. Every by-id lookup reads
 * there. `null` only means "not read yet".
 */

import {
  asConversationId,
  type ConversationSummary,
} from "@ai-matrx/messaging";
import { useMessagingSnapshot } from "@ai-matrx/messaging/react";

export function useConversationSummary(
  conversationId: string | null | undefined,
): ConversationSummary | null {
  const snapshot = useMessagingSnapshot();
  if (!conversationId || snapshot === null) return null;
  return snapshot.conversationSummaries.get(asConversationId(conversationId)) ?? null;
}
