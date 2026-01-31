"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { setCurrentConversation } from "@/features/messaging/redux/messagingSlice";
import { ChatThread } from "@/features/messaging";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const conversationId = params.conversationId as string;

  // Get user from Redux
  const user = useAppSelector((state) => state.user);
  const userId = user?.activeUser?.matrix_id || user?.activeUser?.matrixId;
  const displayName =
    user?.activeUser?.full_name ||
    user?.activeUser?.fullName ||
    user?.activeUser?.email ||
    "User";

  // Set current conversation in Redux
  useEffect(() => {
    if (conversationId) {
      dispatch(setCurrentConversation(conversationId));
    }
  }, [conversationId, dispatch]);

  const handleBack = () => {
    router.push("/messages");
  };

  return (
    <div className="h-[calc(100dvh-var(--header-height,2.5rem))] flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Chat
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
