"use client";

import React, { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  selectConversations,
  selectCurrentConversationId,
  setCurrentConversation,
  closeMessaging,
} from "@/features/messaging/redux/messagingSlice";
import { ConversationList } from "@/features/messaging/components/ConversationList";
import { ChatThread } from "@/features/messaging/components/ChatThread";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(selectConversations);
  const currentConversationId = useAppSelector(selectCurrentConversationId);

  // Get user from Redux - use auth.users.id (UUID)
  const user = useAppSelector((state) => state.user);
  const userId = user?.id;
  const displayName =
    user?.userMetadata?.fullName ||
    user?.userMetadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  // Close side sheet on mount (using full page view)
  useEffect(() => {
    dispatch(closeMessaging());
  }, [dispatch]);

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    dispatch(setCurrentConversation(conversationId));
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] flex overflow-hidden bg-background">
      {/* Sidebar - Conversation List */}
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

      {/* Main Content - Chat Thread or Empty State */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversationId ? (
          <ChatThread
            conversationId={currentConversationId}
            userId={userId}
            displayName={displayName}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
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

      {/* Mobile View - Show either list or chat */}
      <div className="md:hidden absolute inset-0 top-10">
        {currentConversationId ? (
          <div className="h-full flex flex-col bg-background">
            {/* Mobile Header with Back Button */}
            <div className="flex items-center gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => dispatch(setCurrentConversation(null))}
                className="p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="font-medium">
                {conversations.find((c) => c.id === currentConversationId)
                  ?.display_name || "Chat"}
              </span>
            </div>
            <ChatThread
              conversationId={currentConversationId}
              userId={userId}
              displayName={displayName}
              className="flex-1"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col bg-background">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <h1 className="text-lg font-semibold">Messages</h1>
            </div>
            <ConversationList
              userId={userId}
              onConversationSelect={handleConversationSelect}
              className="flex-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
