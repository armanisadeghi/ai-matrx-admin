// File: app/(authenticated)/chat/[id]/page.tsx
import ChatConversationView from "@/features/chat/components/views/ChatConversationView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    return <ChatConversationView existingConversationId={conversationId} />;
}
