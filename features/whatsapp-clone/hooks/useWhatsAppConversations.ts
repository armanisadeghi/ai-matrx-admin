"use client";

import { useEffect, useState } from "react";
import { getMockConversations } from "../mock-data/conversations";
import type { WAConversation } from "../types";
import { useWhatsAppDataMode } from "./WhatsAppDataModeProvider";

export interface UseWhatsAppConversationsReturn {
  conversations: WAConversation[];
  selectedId: string | null;
  select: (id: string | null) => void;
  isLoading: boolean;
  error: string | null;
}

export function useWhatsAppConversations(): UseWhatsAppConversationsReturn {
  const { mode } = useWhatsAppDataMode();
  const [selectedId, setSelectedId] = useState<string | null>("kelvin");
  const [conversations, setConversations] = useState<WAConversation[]>(() =>
    mode === "mock" ? getMockConversations() : [],
  );
  const [isLoading, setIsLoading] = useState(mode === "live");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "mock") {
      setConversations(getMockConversations());
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
        const list = await messagingService.fetchConversations();
        if (cancelled) return;
        const mapped: WAConversation[] = list.map((c) => ({
          id: c.id,
          name: c.display_name ?? c.group_name ?? "Conversation",
          avatarUrl: c.display_image ?? c.group_image_url ?? null,
          isGroup: c.type === "group",
          participants: c.participants.map((p) => ({
            id: p.user_id,
            name: p.user?.display_name ?? p.user?.email ?? "Unknown",
            avatarUrl: p.user?.avatar_url ?? null,
          })),
          lastMessagePreview: c.last_message?.content ?? "",
          lastMessageAt: c.last_message?.created_at ?? c.updated_at,
          lastMessageStatus: c.last_message?.status,
          lastMessageIsOwn: false,
          unreadCount: c.unread_count ?? 0,
        }));
        setConversations(mapped);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load conversations");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return {
    conversations,
    selectedId,
    select: setSelectedId,
    isLoading,
    error,
  };
}
