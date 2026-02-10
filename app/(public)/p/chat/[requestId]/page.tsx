'use client';

import { useParams } from 'next/navigation';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import ChatContainer from '@/features/public-chat/components/ChatContainer';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';

/**
 * Existing Chat Page - loads a conversation by request ID
 *
 * Route: /p/chat/[requestId]
 */
export default function ExistingChatPage() {
    const params = useParams();
    const requestId = params.requestId as string;

    const defaultAgent = {
        promptId: DEFAULT_AGENTS[0].promptId,
        name: DEFAULT_AGENTS[0].name,
        description: DEFAULT_AGENTS[0].description,
        variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
    };

    return (
        <ChatProvider initialAgent={defaultAgent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer
                    className="h-full"
                    existingRequestId={requestId}
                />
            </div>
        </ChatProvider>
    );
}
