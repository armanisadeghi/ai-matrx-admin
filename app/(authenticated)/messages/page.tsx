"use client";

import React, { useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  selectCurrentConversationId,
  setCurrentConversation,
  closeMessaging,
} from "@/features/messaging/redux/messagingSlice";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { ChatThread } from "@/features/messaging/components/ChatThread";
import { MessagesHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { useConversations } from "@/hooks/useSupabaseMessaging";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const dispatch = useAppDispatch();
  const currentConversationId = useAppSelector(selectCurrentConversationId);

  // Get user from Redux - use auth.users.id (UUID)
  const user = useAppSelector((state) => state.user);
  const userId = user?.id;
  const displayName =
    user?.userMetadata?.fullName ||
    user?.userMetadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  // Get conversations from hook for display name lookup
  const { conversations } = useConversations(userId || null);

  // Close side sheet on mount (using full page view)
  useEffect(() => {
    dispatch(closeMessaging());
  }, [dispatch]);

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversationId: string) => {
    dispatch(setCurrentConversation(conversationId));
  }, [dispatch]);

  // Handle back button
  const handleBack = useCallback(() => {
    dispatch(setCurrentConversation(null));
  }, [dispatch]);

  // Get current conversation name for mobile header
  const currentConversationName = currentConversationId 
    ? conversations.find((c) => c.id === currentConversationId)?.display_name || "Chat"
    : null;

  return (
    <>
      {/* Header injected into main layout - shows back button when in chat on mobile */}
      <MessagesHeader 
        title={currentConversationName || undefined}
        showBack={!!currentConversationId}
        onBack={handleBack}
      />

      <div className="h-[calc(100vh-2.5rem)] flex overflow-hidden bg-background">
        {/* Desktop: Sidebar - Conversation List */}
        <div
          className={cn(
            "w-80 border-r border-zinc-200 dark:border-zinc-800 shrink-0",
            "hidden md:flex flex-col"
          )}
        >
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <h1 className="text-lg font-semibold">Messages</h1>
          </div>
          <ConversationList
            userId={userId}
            onConversationSelect={handleConversationSelect}
            className="flex-1"
          />
        </div>

        {/* Desktop: Main Content - Chat Thread or Empty State */}
        <div className="flex-1 hidden md:flex flex-col min-w-0">
          {currentConversationId ? (
            <ChatThread
              conversationId={currentConversationId}
              userId={userId}
              displayName={displayName}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-zinc-400" />
              </div>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Select a conversation
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                Choose a conversation from the list or start a new one to begin messaging
              </p>
            </div>
          )}
        </div>

        {/* Mobile View - Show either list or chat (full screen) */}
        <div className="md:hidden flex-1 flex flex-col">
          {currentConversationId ? (
            <ChatThread
              conversationId={currentConversationId}
              userId={userId}
              displayName={displayName}
              className="flex-1"
            />
          ) : (
            <>
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                <h1 className="text-lg font-semibold">Messages</h1>
              </div>
              <ConversationList
                userId={userId}
                onConversationSelect={handleConversationSelect}
                className="flex-1"
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
