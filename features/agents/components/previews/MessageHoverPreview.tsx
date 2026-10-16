"use client";

/**
 * Lightweight hover preview for a single message, drawn by THE Peek. Reads from Redux directly —
 * no fetch — because messages are essentially always already in state by the
 * time anything renders a reference to one. Pairs with ConversationHoverPreview
 * for "attached" chips and inline links.
 */

import { Peek, PeekHoverCard, type PeekRecord } from "@ai-matrx/design-system";
import { kindTextToMarkdown } from "@/features/content-ir/surfaces/kind-text-to-markdown";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  extractInspectableText,
  selectMessageById,
} from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import { selectInstance } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import { CircleDot, Settings, User, Wrench } from "lucide-react";
import { formatDateTime } from "./peek-lines";

const MESSAGE_PREVIEW_CHARS = 600;

const ROLE_STYLE: Record<string, { Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  system: { Icon: Settings, label: "System" },
  user: { Icon: User, label: "User" },
  assistant: { Icon: CircleDot, label: "Assistant" },
};

function countToolCalls(content: unknown): number {
  if (!Array.isArray(content)) return 0;
  return (content as Array<{ type?: string }>).filter((b) => b?.type === "tool_call").length;
}

interface MessagePreviewContentProps {
  conversationId: string;
  messageId: string;
  /** When provided, "Open" calls this; otherwise links to the conversation. */
  onOpen?: () => void;
  /** `surface` when this is the card itself (a hover), `bare` inside a panel that already frames it. */
  frame?: "surface" | "bare";
}

export function MessagePreviewContent({ conversationId, messageId, onOpen, frame = "bare" }: MessagePreviewContentProps) {
  const message = useAppSelector(selectMessageById(conversationId, messageId));
  const conversation = useAppSelector(selectInstance(conversationId));

  // Structured (non-text) payloads preview instead of a blank ("screen lies" class fix).
  // A preview is read by a person: a `__kind` answer previews as its kind's
  // markdown, never its stored JSON (the record itself is untouched).
  const text = message ? kindTextToMarkdown(extractInspectableText(message).text) : "";
  const toolCalls = countToolCalls(message?.content);

  if (!message) {
    return <Peek frame={frame} record={{ kind: "Message", id: messageId, title: "Message not loaded", copyData: false }} />;
  }

  const role = ROLE_STYLE[message.role as string] ?? ROLE_STYLE["assistant"]!;
  const truncated = text.length > MESSAGE_PREVIEW_CHARS ? text.slice(0, MESSAGE_PREVIEW_CHARS).trimEnd() + "…" : text;
  const conversationTitle = conversation?.title?.trim();
  const openHref = conversation ? `/agents/go/${conversation.agentId}/run?conversationId=${conversationId}` : null;

  const record: PeekRecord = {
    kind: "Message",
    id: messageId,
    title: message.position != null ? `${role.label} · #${message.position + 1}` : role.label,
    glyph: role.Icon,
    ...(conversationTitle ? { subtitle: `in ${conversationTitle}` } : {}),
    body: [
      ...(toolCalls > 0 ? [{ fact: `${toolCalls} tool${toolCalls === 1 ? "" : "s"}`, glyph: Wrench }] : []),
      truncated.trim()
        ? { section: "Message", text: truncated, breaks: true }
        : // read-gate-exempt: describes one message record already loaded in the store (non-text message), not a read's empty answer
          { fact: "No text content", muted: true },
      { fact: formatDateTime(message.createdAt), muted: true },
    ],
    // The old Copy button copied the whole message text (disabled when there is none).
    copyData: text ? text : false,
    ...(onOpen ? { primary: { label: "Open", onSelect: onOpen } } : openHref ? { href: openHref } : {}),
  };
  return <Peek frame={frame} record={record} />;
}

interface MessageHoverPreviewProps {
  conversationId: string;
  messageId: string;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  onOpen?: () => void;
  className?: string;
}

/**
 * Wraps a trigger element in a hover-only popover that previews a single
 * message. The trigger receives no visual modification — it stays exactly as
 * authored.
 */
export function MessageHoverPreview({
  conversationId,
  messageId,
  children,
  side = "right",
  align = "start",
  onOpen,
}: MessageHoverPreviewProps) {
  return (
    <PeekHoverCard trigger={children} side={side} align={align} label="Message">
      <MessagePreviewContent conversationId={conversationId} messageId={messageId} onOpen={onOpen} frame="surface" />
    </PeekHoverCard>
  );
}
