'use client';

import React from 'react';
import { ChatProvider } from '@/features/public-chat';
import { ChatContainer } from '@/features/public-chat';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';

export default function PublicChatPage() {
    // Default to the general chat agent
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
