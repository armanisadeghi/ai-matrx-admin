"use client";

import React, { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  setConversations,
  setLoading,
  setError,
  setCurrentConversation,
  selectCurrentConversationId,
} from "@/features/messaging/redux/messagingSlice";
import { useConversations } from "@/hooks/useSupabaseMessaging";
import { ConversationList, ChatThread } from "@/features/messaging";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const dispatch = useAppDispatch();
  const currentConversationId = useAppSelector(selectCurrentConversationId);
  const isMobile = useIsMobile();

  // Get user from Redux
  const user = useAppSelector((state) => state.user);
  const userId = user?.activeUser?.matrix_id || user?.activeUser?.matrixId;
  const displayName =
    user?.activeUser?.full_name ||
    user?.activeUser?.fullName ||
    user?.activeUser?.email ||
    "User";

  // Load conversations
  const { conversations, isLoading, error, totalUnreadCount } = useConversations(
    userId || null
  );

  // Sync conversations to Redux
  useEffect(() => {
    dispatch(setConversations(conversations));
  }, [conversations, dispatch]);

  useEffect(() => {
    dispatch(setLoading(isLoading));
  }, [isLoading, dispatch]);

  useEffect(() => {
    dispatch(setError(error));
  }, [error, dispatch]);

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    dispatch(setCurrentConversation(conversationId));
  };

  // Mobile: Show either list or thread
  if (isMobile) {
    return (
      <div className="h-[calc(100dvh-var(--header-height,2.5rem))] flex flex-col overflow-hidden bg-background">
        {currentConversationId ? (
          <ChatThread
            conversationId={currentConversationId}
            userId={userId}
            displayName={displayName}
            className="flex-1"
          />
        ) : (
          <ConversationList
            userId={userId}
            onConversationSelect={handleConversationSelect}
            className="flex-1"
          />
        )}
      </div>
    );
  }

  // Desktop: Split view
  return (
    <div className="h-[calc(100vh-var(--header-height,2.5rem))] flex overflow-hidden bg-background">
      {/* Conversation List - Left Panel */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Messages
          </h1>
        </div>
        <ConversationList
          userId={userId}
          onConversationSelect={handleConversationSelect}
          className="flex-1"
        />
      </div>

      {/* Chat Thread - Right Panel */}
      <div className="flex-1 flex flex-col">
        {currentConversationId ? (
          <ChatThread
            conversationId={currentConversationId}
            userId={userId}
            displayName={displayName}
            className="flex-1"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Select a conversation
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
