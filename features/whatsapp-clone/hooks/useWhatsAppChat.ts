"use client";

import { useEffect, useState } from "react";
import { getMockMessages } from "../mock-data/messages";
import type { WAMessage } from "../types";
import { useWhatsAppDataMode } from "./WhatsAppDataModeProvider";

export interface UseWhatsAppChatReturn {
  messages: WAMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  typingText: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: () => Promise<void>;
}

export function useWhatsAppChat(
  conversationId: string | null,
): UseWhatsAppChatReturn {
  const { mode } = useWhatsAppDataMode();
  const [messages, setMessages] = useState<WAMessage[]>(() =>
    mode === "mock" && conversationId ? getMockMessages(conversationId) : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingText, setTypingText] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (mode === "mock") {
      setMessages(getMockMessages(conversationId));
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const { messagingService } = await import(
          "@/lib/supabase/messaging"
        );
        const fetched = await messagingService.fetchMessages(conversationId);
        if (cancelled) return;
        const mapped: WAMessage[] = fetched.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          type: (m.message_type ?? "text") as WAMessage["type"],
          content: m.content,
          authorId: m.sender_id,
          isOwn: false,
          createdAt: m.created_at,
          editedAt: m.edited_at,
          status: (m.status ?? "sent") as WAMessage["status"],
        }));
        setMessages(mapped);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load messages");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, mode]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || !conversationId) return;
    setIsSending(true);
    try {
      if (mode === "mock") {
        const optimistic: WAMessage = {
          id: `m-${Date.now()}`,
          conversationId,
          type: "text",
          content,
          authorId: "me",
          isOwn: true,
          createdAt: new Date().toISOString(),
          status: "sent",
        };
        setMessages((prev) => [...prev, optimistic]);
        return;
      }
      const { messagingService } = await import("@/lib/supabase/messaging");
      await messagingService.sendMessage({
        conversation_id: conversationId,
        content,
        message_type: "text",
        client_message_id: `c-${Date.now()}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const loadMore = async () => {};
  const markRead = async () => {};

  return {
    messages,
    isLoading,
    isSending,
    error,
    typingText,
    sendMessage,
    loadMore,
    markRead,
  };
}
