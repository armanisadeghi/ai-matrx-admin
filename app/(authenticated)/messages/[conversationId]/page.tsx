"use client";

import React, { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { 
  closeMessaging,
  setCurrentConversation,
  selectConversations,
} from "@/features/messaging/redux/messagingSlice";
import { ChatThread } from "@/features/messaging/components/ChatThread";
import { MessagesHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import { useOnlinePresence } from "@/hooks/useSupabaseMessaging";

export default function ConversationPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const conversationId = params.conversationId as string;

  // Get user from Redux - use auth.users.id (UUID)
  const user = useAppSelector((state) => state.user);
  const userId = user?.id;
  const displayName = useMemo(() =>
    user?.userMetadata?.fullName ||
    user?.userMetadata?.name ||
    user?.email?.split("@")[0] ||
    "User",
    [user?.userMetadata?.fullName, user?.userMetadata?.name, user?.email]
  );

  // Get conversations from Redux (centralized state)
  const conversations = useAppSelector(selectConversations);
  const currentConversation = conversations.find((c) => c.id === conversationId);

  // Get online presence for header
  const { onlineUsers } = useOnlinePresence(conversationId, userId || null, displayName);
  
  // For direct chats, check if the other user is online
  const otherParticipant = currentConversation?.type === "direct"
    ? currentConversation.participants?.find((p) => p.user_id !== userId)
    : null;
  
  const isOtherUserOnline = otherParticipant
    ? onlineUsers.some((u) => u.user_id === otherParticipant.user_id)
    : undefined;

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
      {/* Header injected into main layout */}
      <MessagesHeader 
        title={currentConversation?.display_name || "Chat"}
        showBack
        backHref="/messages"
        avatarUrl={currentConversation?.display_image}
        isOnline={currentConversation?.type === "direct" ? isOtherUserOnline : undefined}
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
