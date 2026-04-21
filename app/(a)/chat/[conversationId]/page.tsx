import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ChatRoomClient } from "@/features/agents/components/chat/ChatRoomClient";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

/**
 * First-paint: SSR resolves the owning agentId for the conversation so the
 * client shell can mount without a round-trip. The full bundle (messages,
 * variables, overrides, observability) is hydrated client-side via
 * `loadConversation` — this keeps the critical path small and lets the
 * conversation stream in progressively.
 */
async function resolveAgentIdForConversation(
  conversationId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cx_conversation")
    .select("initial_agent_id")
    .eq("id", conversationId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return (data.initial_agent_id as string | null) ?? null;
}

export default async function ChatConversationPage({
  params,
}: ConversationPageProps) {
  const { conversationId } = await params;

  const agentId = await resolveAgentIdForConversation(conversationId);
  if (!agentId) {
    redirect("/chat/new");
    notFound();
  }

  return (
    <ChatRoomClient agentId={agentId} conversationId={conversationId} />
  );
}
