// app/(ssr)/ssr/chat/_components/ChatWelcomeServer.tsx
//
// Thin server wrapper — delegates layout to the client island because
// the guided/classic variable toggle (a client-side search param) changes
// the entire page structure (bottom-pinned vs. centered).

import ChatWelcomeClient from './ChatWelcomeClient';
import type { PromptVariable } from '@/features/prompts/types/core';

export interface WelcomeAgent {
    promptId: string;
    name: string;
    description?: string;
    variableDefaults?: PromptVariable[];
}

interface ChatWelcomeServerProps {
    agent: WelcomeAgent;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

export default function ChatWelcomeServer({
    agent,
    isAuthenticated,
    isAdmin,
}: ChatWelcomeServerProps) {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <ChatWelcomeClient
                agent={agent}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
            />
        </div>
    );
}
