// app/(public)/p/chat/c/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import ChatContainer from '@/features/public-chat/components/ChatContainer';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { useLayoutAgent } from '../../ChatLayoutShell';

/**
 * Conversation-Direct Route — loads an existing conversation by ID.
 *
 * Route: /p/chat/c/[id]
 *
 * Reads agent from layout context (single source of truth).
 * Passes existingRequestId to ChatContainer to load conversation messages.
 */
export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;
    const { selectedAgent } = useLayoutAgent();

    return (
        <ChatProvider initialAgent={selectedAgent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer
                    className="h-full"
                    existingRequestId={conversationId}
                />
            </div>
        </ChatProvider>
    );
}
