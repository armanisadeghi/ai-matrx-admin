// app/(public)/p/chat/page.tsx
'use client';

import { ChatProvider, ChatContainer } from '@/features/public-chat';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';

/**
 * Public Chat Page
 * 
 * Uses LiteProviders from layout (lightweight Redux without entities/socket/sagas).
 * The main performance win is the lite store - no need for complex lazy loading here.
 */
export default function PublicChatPage() {
    const defaultAgent = {
        promptId: DEFAULT_AGENTS[0].promptId,
        name: DEFAULT_AGENTS[0].name,
        description: DEFAULT_AGENTS[0].description,
        variables: DEFAULT_AGENTS[0].variables,
    };

    return (
        <ChatProvider initialAgent={defaultAgent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer className="h-full" />
            </div>
        </ChatProvider>
    );
}
