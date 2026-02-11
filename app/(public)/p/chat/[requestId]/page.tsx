'use client';

import { useParams } from 'next/navigation';
import ChatContainer from '@/features/public-chat/components/ChatContainer';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { useLayoutAgent } from '../ChatLayoutShell';

/**
 * Existing Chat Page - loads a conversation by request ID
 *
 * Route: /p/chat/[requestId]
 */
export default function ExistingChatPage() {
    const params = useParams();
    const requestId = params.requestId as string;
    const agent = useLayoutAgent();

    return (
        <ChatProvider initialAgent={agent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer
                    className="h-full"
                    existingRequestId={requestId}
                />
            </div>
        </ChatProvider>
    );
}
