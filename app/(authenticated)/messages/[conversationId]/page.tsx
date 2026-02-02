"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { 
  closeMessaging,
  setCurrentConversation,
  selectConversations,
} from "@/features/messaging/redux/messagingSlice";
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

  // Get conversations from Redux (centralized state)
  const conversations = useAppSelector(selectConversations);
  const currentConversation = conversations.find((c) => c.id === conversationId);

  // Close side sheet and set current conversation on mount
  useEffect(() => {
    dispatch(closeMessaging());
    dispatch(setCurrentConversation(conversationId));
    
    // Clear current conversation when leaving
    return () => {
      dispatch(setCurrentConversation(null));
    };
  }, [dispatch, conversationId]);

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
