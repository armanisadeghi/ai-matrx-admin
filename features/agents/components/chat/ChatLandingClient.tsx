"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectGlobalConversationList,
  selectGlobalListStatus,
} from "@/features/agents/redux/conversation-list/conversation-list.selectors";
import { fetchGlobalConversations } from "@/features/agents/redux/conversation-list/conversation-list.thunks";

/**
 * Default `(a)/chat` landing. Fetches the user's most recent conversations
 * and either redirects to the latest one or to the agent picker at `/chat/new`.
 * This keeps the route reaction-free when the user has history, and falls back
 * to a friendly empty state when they don't.
 */
export function ChatLandingClient() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector(selectGlobalListStatus);
  const conversations = useAppSelector(selectGlobalConversationList);
  const routedRef = useRef(false);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchGlobalConversations({ limit: 25 }));
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (routedRef.current) return;
    if (status !== "succeeded" && status !== "failed") return;
    routedRef.current = true;
    if (conversations.length > 0) {
      router.replace(`/chat/${conversations[0].conversationId}`);
    } else {
      router.replace("/chat/new");
    }
  }, [status, conversations, router]);

  return (
    <div className="h-[calc(100dvh-var(--header-height,2.5rem))] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm">Opening chat...</span>
    </div>
  );
}
