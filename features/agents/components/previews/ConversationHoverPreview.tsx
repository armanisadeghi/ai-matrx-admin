"use client";

/**
 * Lightweight hover preview for a conversation, drawn by THE Peek. Reads from Redux directly —
 * no fetch — because conversations are essentially always already in state by
 * the time anything renders a reference to them. Designed for inline triggers
 * like sidebar rows and attachment chips.
 */

import { Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";
import { MessagesSquare } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectInstance } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import { selectMessageCount } from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { useAgentName } from "@ai-matrx/chat/agents/identity/agent-identity";
import { formatDateTime } from "./peek-lines";

type StatusTone = "warning" | "success" | "danger" | "neutral";

const STATUS_TONE: Record<string, StatusTone> = {
  running: "warning",
  streaming: "warning",
  complete: "success",
  error: "danger",
};

interface ConversationPreviewContentProps {
  conversationId: string;
  /** When provided, the "Open" button calls this instead of navigating. */
  onOpen?: () => void;
  /** `surface` when this is the card itself (a hover), `bare` inside a panel that already frames it. */
  frame?: "surface" | "bare";
}

/**
 * Pure body content for the conversation preview. Use directly when you want
 * the preview to render without a hover trigger (e.g. inside another popover).
 */
export function ConversationPreviewContent({ conversationId, onOpen, frame = "bare" }: ConversationPreviewContentProps) {
  const conv = useAppSelector(selectInstance(conversationId));
  const agentName = useAgentName(conv?.agentId ?? "");
  const messageCount = useAppSelector(selectMessageCount(conversationId));
  // The count is of messages this browser holds; before they are loaded it is
  // not an answer (a preview of an unloaded conversation would say "0 msgs").
  const hasLoadedMessages = useAppSelector((state) => state.messages.byConversationId[conversationId] != null);

  if (!conv) {
    return <Peek frame={frame} record={{ kind: "Conversation", id: conversationId, title: "Conversation not loaded", copyData: false }} />;
  }

  const status = (conv.status ?? "ready") as string;
  const keywords = conv.keywords?.slice(0, 6) ?? [];

  const record: PeekRecord = {
    kind: "Conversation",
    id: conversationId,
    title: conv.title?.trim() || "Untitled",
    glyph: MessagesSquare,
    ...(agentName ? { subtitle: agentName } : {}),
    body: [
      { section: "Status", rows: [{ text: status.charAt(0).toUpperCase() + status.slice(1), tone: STATUS_TONE[status] ?? "neutral" }] },
      ...(hasLoadedMessages ? [{ property: "Messages", value: `${messageCount} msg${messageCount === 1 ? "" : "s"}` }] : []),
      ...(conv.isEphemeral ? [{ fact: "ephemeral", muted: true }] : []),
      ...(conv.description ? [{ section: "Description", text: conv.description, markdown: true, clamp: 3 as const }] : []),
      ...(keywords.length > 0 ? [{ section: "Keywords", tags: keywords }] : []),
      { property: "Updated", value: formatDateTime(conv.updatedAt) },
      { property: "Created", value: formatDateTime(conv.createdAt) },
    ],
    // The old Copy ID button copied the conversation's id.
    copyData: conversationId,
    ...(onOpen
      ? { primary: { label: "Open", onSelect: onOpen } }
      : { href: `/agents/go/${conv.agentId}/run?conversationId=${conversationId}` }),
  };
  return <Peek frame={frame} record={record} />;
}

interface ConversationHoverPreviewProps {
  conversationId: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** When provided, the "Open" button calls this instead of navigating. */
  onOpen?: () => void;
  className?: string;
}

/**
 * Wraps a trigger element in a hover-only popover that previews a conversation.
 * The trigger receives no visual modification — it stays exactly as authored.
 */
export function ConversationHoverPreview({ conversationId, children, side = "right", align = "start", onOpen }: ConversationHoverPreviewProps) {
  return (
    <PeekHoverCard trigger={children} side={side} align={align} label="Conversation">
      <ConversationPreviewContent conversationId={conversationId} onOpen={onOpen} frame="surface" />
    </PeekHoverCard>
  );
}
