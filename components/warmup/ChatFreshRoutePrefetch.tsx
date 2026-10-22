"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInPlaceChatHost } from "@ai-matrx/chat/agents/components/chat/in-place-chat-host";

/**
 * "New chat" reacts on the click (owner, 2026-10-21: no reaction for 1.5 s). The fresh
 * routes each have a `loading.tsx` (the same splash skeleton their pages stream first);
 * prefetching them caches that loading state, so the click changes the address and paints
 * the splash at once instead of waiting a server round trip. Two routes only: `/chat/new`
 * and the open conversation's own agent route (where "New chat" goes when that agent is
 * not the default). Renders nothing.
 */
export function ChatFreshRoutePrefetch() {
  const router = useRouter();
  const host = useInPlaceChatHost();
  const agentId = host?.activeAgentId ?? null;
  useEffect(() => {
    router.prefetch("/chat/new");
  }, [router]);
  useEffect(() => {
    if (agentId) router.prefetch(`/chat/a/${encodeURIComponent(agentId)}`);
  }, [router, agentId]);
  return null;
}
