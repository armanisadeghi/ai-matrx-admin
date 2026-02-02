"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { closeMessaging } from "@/features/messaging/redux/messagingSlice";
import { useConversations } from "@/hooks/useSupabaseMessaging";
import { ChatThread } from "@/features/messaging/components/ChatThread";
import { MessagesHeader } from "@/components/layout/new-layout/PageSpecificHeader";

export default function ConversationPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const conversationId = params.conversationId as string;

  // Get user from Redux - use auth.users.id (UUID)
  const user = useAppSelector((state) => state.user);
  const userId = user?.id;
  const displayName =
    user?.userMetadata?.fullName ||
    user?.userMetadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  // Get conversations to find current conversation for display name
  const { conversations } = useConversations(userId || null);
  const currentConversation = conversations.find((c) => c.id === conversationId);

  // Close side sheet on mount (using full page view)
  useEffect(() => {
    dispatch(closeMessaging());
  }, [dispatch]);

  return (
    <>
      {/* Header injected into main layout - mobile only shows back button */}
      <MessagesHeader 
        title={currentConversation?.display_name || "Chat"}
        showBack
        backHref="/messages"
      />
      
      {/* Chat Thread - Full height */}
      <div className="h-full flex flex-col overflow-hidden bg-background">
        <ChatThread
          conversationId={conversationId}
          userId={userId}
          displayName={displayName}
          className="flex-1"
        />
      </div>
    </>
  );
}
