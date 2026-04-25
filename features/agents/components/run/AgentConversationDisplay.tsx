"use client";

/**
 * AgentConversationDisplay
 *
 * Renders the conversation transcript. Reads ONLY from `messages.byId +
 * orderedIds` (MessageRecord shape) — there is no legacy turn array.
 *
 * Child components receive identifiers only (messageId, conversationId,
 * requestId) and subscribe to their own data:
 *
 *   - Committed messages:        byId[messageId] (status "active")
 *   - Reserved assistant skel:   byId[messageId] (status "reserved", empty content)
 *   - Live streaming turn:       activeRequests[requestId] (text appears here
 *                                as chunks stream in; byId gets the final
 *                                content on completion)
 *
 * During a live stream the reserved assistant record exists in byId but has
 * empty content; we skip it in the list and push a `__streaming__` entry
 * that renders from activeRequests. When completion lands,
 * `updateMessageRecord` writes the final `CxContentBlock[]` to the same byId
 * entry and the streaming entry disappears.
 */

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectConversationMessages } from "@/features/agents/redux/execution-system/messages/messages.selectors";
import {
  selectStreamPhase,
  selectLatestRequestId,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { AgentUserMessage } from "./AgentUserMessage";

const AgentAssistantMessage = dynamic(
  () =>
    import("./AgentAssistantMessage").then((m) => ({
      default: m.AgentAssistantMessage,
    })),
  { ssr: false },
);

const AgentEmptyMessageDisplay = dynamic(
  () =>
    import("../shared/AgentEmptyMessageDisplay").then((m) => ({
      default: m.AgentEmptyMessageDisplay,
    })),
  { ssr: false },
);

interface DisplayEntry {
  key: string;
  role: "user" | "assistant" | "system";
  /** Server-assigned `cx_message.id` for committed rows; null for the live entry. */
  messageId: string | null;
  /** Live stream request id — set only on the `__streaming__` entry. */
  requestId: string | null;
  isStreamActive: boolean;
}

interface AgentConversationDisplayProps {
  conversationId: string;
  /**
   * The UI surface this transcript belongs to. Threaded into per-message
   * action bars so fork / delete / retry outcomes route correctly via the
   * surfaces registry. Optional — components fall back to local behavior
   * when omitted (e.g. embedded previews).
   */
  surfaceKey?: string;
  compact?: boolean;
}

function isEmptyReservedAssistant(record: {
  role: string;
  status: string;
  content: unknown;
}): boolean {
  if (record.role !== "assistant") return false;
  if (record.status !== "reserved") return false;
  return Array.isArray(record.content) && record.content.length === 0;
}

export function AgentConversationDisplay({
  conversationId,
  surfaceKey,
  compact = false,
}: AgentConversationDisplayProps) {
  const messages = useAppSelector(selectConversationMessages(conversationId));
  const phase = useAppSelector(selectStreamPhase(conversationId));
  const latestRequestId = useAppSelector(selectLatestRequestId(conversationId));
  const bottomRef = useRef<HTMLDivElement>(null);

  const isActive =
    phase === "connecting" ||
    phase === "pre_token" ||
    phase === "text_streaming" ||
    phase === "interstitial" ||
    phase === "error";

  const displayEntries = useMemo((): DisplayEntry[] => {
    const entries: DisplayEntry[] = [];
    for (const rec of messages) {
      if (isEmptyReservedAssistant(rec)) continue;
      entries.push({
        key: rec.id,
        role: rec.role,
        messageId: rec.id,
        requestId: rec._streamRequestId ?? null,
        isStreamActive: false,
      });
    }

    if (isActive) {
      entries.push({
        key: "__streaming__",
        role: "assistant",
        messageId: null,
        requestId: latestRequestId ?? null,
        isStreamActive: true,
      });
    }

    return entries;
  }, [messages, isActive, latestRequestId]);

  // Diagnostic logging — unconditional (not behind NODE_ENV check) so the
  // single path "Runner loads conversation" can be observed from production.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      "[AgentConversationDisplay] cid=%s messages=%d phase=%s active=%s entries=%d",
      conversationId,
      messages.length,
      phase ?? "idle",
      isActive,
      displayEntries.length,
    );
  }, [conversationId, messages.length, phase, isActive, displayEntries.length]);

  const prevLengthRef = useRef(displayEntries.length);
  useEffect(() => {
    if (displayEntries.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = displayEntries.length;
  }, [displayEntries.length]);

  if (displayEntries.length === 0) {
    return <AgentEmptyMessageDisplay conversationId={conversationId} />;
  }

  const spacingClass = compact ? "space-y-2 pb-2" : "space-y-6 pb-24";

  return (
    <div className={`${spacingClass} p-2 scrollbar-hide`}>
      {displayEntries.map((entry) => {
        if (entry.role === "user" && entry.messageId) {
          return (
            <AgentUserMessage
              key={entry.key}
              conversationId={conversationId}
              messageId={entry.messageId}
              surfaceKey={surfaceKey}
              compact={compact}
            />
          );
        }

        if (entry.role === "assistant") {
          return (
            <AgentAssistantMessage
              key={entry.key}
              conversationId={conversationId}
              requestId={entry.requestId ?? undefined}
              messageId={entry.messageId ?? undefined}
              isStreamActive={entry.isStreamActive}
              surfaceKey={surfaceKey}
              compact={compact}
            />
          );
        }

        return null;
      })}

      <div ref={bottomRef} />
    </div>
  );
}
