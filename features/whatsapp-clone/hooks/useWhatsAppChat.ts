"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { useChat } from "@/hooks/useSupabaseMessaging";
import type { MessageWithSender } from "@/features/messaging/types";
import { getMockMessages } from "../mock-data/messages";
import type { WAMessage } from "../types";
import { useWhatsAppDataMode } from "./WhatsAppDataModeProvider";

export interface SendMessageOptions {
  message_type?: "text" | "image" | "video" | "audio" | "file";
  media_url?: string;
  media_thumbnail_url?: string;
  media_metadata?: Record<string, unknown>;
  reply_to_id?: string;
}

export interface UseWhatsAppChatReturn {
  messages: WAMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  typingText: string | null;
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: () => Promise<void>;
}

function adaptMessage(m: MessageWithSender, selfUserId: string | null): WAMessage {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    type: (m.message_type ?? "text") as WAMessage["type"],
    content: m.content,
    authorId: m.sender_id,
    isOwn: !!selfUserId && m.sender_id === selfUserId,
    createdAt: m.created_at,
    editedAt: m.edited_at,
    status: (m.status ?? "sent") as WAMessage["status"],
    media:
      m.message_type === "image" ||
      m.message_type === "video" ||
      m.message_type === "audio" ||
      m.message_type === "file"
        ? {
            url: m.media_url ?? undefined,
            thumbnailUrl: m.media_thumbnail_url ?? undefined,
            fileName:
              (m.media_metadata as { file_name?: string } | null)?.file_name,
            fileSize:
              (m.media_metadata as { file_size?: number } | null)?.file_size,
            durationSec:
              (m.media_metadata as { duration_sec?: number } | null)
                ?.duration_sec,
            mimeType: (m.media_metadata as { mime_type?: string } | null)
              ?.mime_type,
          }
        : null,
    systemKind: m.message_type === "system" ? "encryption" : undefined,
  };
}

export function useWhatsAppChat(
  conversationId: string | null,
): UseWhatsAppChatReturn {
  const { mode } = useWhatsAppDataMode();
  const user = useAppSelector(selectUser);
  const userId = user?.id ?? null;
  const displayName =
    user?.userMetadata?.fullName ??
    user?.userMetadata?.name ??
    user?.email?.split("@")[0] ??
    "User";

  const live = useChat(
    mode === "live" ? conversationId : null,
    mode === "live" ? userId : null,
    displayName,
    { autoMarkAsRead: true },
  );

  const liveMessages = useMemo(
    () => live.messages.map((m) => adaptMessage(m, userId)),
    [live.messages, userId],
  );

  if (mode === "mock") {
    const mocks = conversationId ? getMockMessages(conversationId) : [];
    return {
      messages: mocks,
      isLoading: false,
      isSending: false,
      error: null,
      typingText: null,
      sendMessage: async () => {},
      loadMore: async () => {},
      markRead: async () => {},
    };
  }

  return {
    messages: liveMessages,
    isLoading: live.isLoading,
    isSending: live.isSending,
    error: live.error,
    typingText: live.typingText ?? null,
    sendMessage: async (content, options) => {
      await live.sendMessage(content, options);
    },
    loadMore: async () => {
      await live.loadMoreMessages();
    },
    markRead: async () => {
      await live.markAsRead();
    },
  };
}
