// File: app/(authenticated)/chat/[id]/page.tsx

import ChatConversationView from "@/features/chat/ui-parts/layout/ChatConversationView";

export default async function ChatIdPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const conversationId = resolvedParams.id;
  
  return <ChatConversationView conversationId={conversationId} />;
}