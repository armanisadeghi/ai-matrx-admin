// app/(public)/p/chat/page.tsx
'use client';

import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import ChatContainer from '@/features/public-chat/components/ChatContainer';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';

/**
 * Public Chat Page
 * 
 * Redux (LiteStoreProvider) available from PublicProviders in the public layout.
 * Lightweight store - no entities/socket/sagas.
 */
export default function PublicChatPage() {
    const defaultAgent = {
        promptId: DEFAULT_AGENTS[0].promptId,
        name: DEFAULT_AGENTS[0].name,
        description: DEFAULT_AGENTS[0].description,
        variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
    };

    return (
        <ChatProvider initialAgent={defaultAgent}>
            <div className="h-full w-full bg-textured">
                <ChatContainer className="h-full" />
            </div>
        </ChatProvider>
    );
}
