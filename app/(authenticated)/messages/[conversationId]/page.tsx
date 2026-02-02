"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  setCurrentConversation,
  selectCurrentConversation,
  closeMessaging,
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

  const currentConversation = useAppSelector(selectCurrentConversation);

  // Set current conversation on mount
  useEffect(() => {
    if (conversationId) {
      dispatch(setCurrentConversation(conversationId));
      dispatch(closeMessaging()); // Close side sheet when viewing full page
    }
  }, [conversationId, dispatch]);

  return (
    <>
      {/* Header injected into main layout */}
      <MessagesHeader 
        title={currentConversation?.display_name || "Chat"}
        showBack
        backHref="/messages"
      />
      
      {/* Chat Thread - Full height */}
      <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-background">
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
