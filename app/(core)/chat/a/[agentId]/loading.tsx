import { ChatNewLandingSkeleton } from "@ai-matrx/chat/agents/components/chat/ChatNewClient";

/**
 * The fresh-chat splash skeleton — the page's own first streamed paint — as the route's
 * loading state, so a prefetched "New chat" paints it on the click (ChatFreshRoutePrefetch).
 */
export default function Loading() {
  return <ChatNewLandingSkeleton />;
}
