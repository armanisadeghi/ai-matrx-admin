"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import {
  setCurrentConversation,
  selectCurrentConversation,
  closeMessaging,
} from "@/features/messaging/redux/messagingSlice";
import { ChatThread } from "@/features/messaging/components/ChatThread";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
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
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <Link href="/messages">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-base font-semibold">
          {currentConversation?.display_name || "Conversation"}
        </h1>
      </div>

      {/* Chat Thread */}
      <ChatThread
        conversationId={conversationId}
        userId={userId}
        displayName={displayName}
        className="flex-1"
      />
    </div>
  );
}
