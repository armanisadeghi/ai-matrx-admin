// app/(ssr)/ssr/chat/c/[conversationId]/page.tsx
//
// Conversation route — /ssr/chat/c/[conversationId]
// Server component that:
//   1. Reads conversationId and searchParams (agent, new)
//   2. Fires a warm call for existing conversations (skips for new)
//   3. Renders the conversation client island inside Suspense
//
// ?new=true — conversation was just submitted from the welcome screen.
//   The client reads firstMessage from Redux and starts streaming immediately
//   without fetching from DB.
//
// ?agent=xxx — keeps the agent ID in the URL for header/sidebar display
//   and for "new conversation" actions with the same agent.

import { Suspense } from "react";
import ChatHeaderControls from "@/features/cx-chat/components/ChatHeaderControls";
import ChatConversationClient from "@/features/cx-chat/components/ChatConversationClient";
import { ChatConversationSkeleton } from "@/features/cx-chat/components/ChatConversationSkeleton";
import { BACKEND_URLS, ENDPOINTS } from "@/lib/api/endpoints";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ agent?: string; new?: string }>;
}) {
  const [{ conversationId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const agentId = resolvedSearchParams.agent;
  const isNew = resolvedSearchParams.new === "true";

  // Warm the conversation on the Python backend (skip for new conversations)
  if (!isNew && conversationId !== "new") {
    fetch(
      `${BACKEND_URLS.production}${ENDPOINTS.ai.conversationWarm(conversationId)}`,
      {
        method: "POST",
      },
    ).catch(() => {});
  }

  return (
    <>
      <ChatHeaderControls />
      <Suspense fallback={<ChatConversationSkeleton />}>
        <ChatConversationClient
          conversationId={conversationId}
          agentId={agentId}
          isNew={isNew}
        />
      </Suspense>
    </>
  );
}
