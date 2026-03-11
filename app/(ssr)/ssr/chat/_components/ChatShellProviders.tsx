'use client';

// ChatShellProviders — Wraps both sidebar and workspace with shared context.
// AgentsProvider supplies agent data to both the sidebar agent chips and header agent picker.
// ChatProvider manages conversation/message state shared across the workspace.
// SsrAgentProvider manages selected agent state and syncs it to ChatContext + URL.
//
// mobileHeader is passed as a slot so that ChatMobileHeaderBar (and its
// ChatMobileAgentName island) render inside the SsrAgentProvider tree.

import { ReactNode } from 'react';
import { AgentsProvider } from '@/features/public-chat/context/AgentsContext';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { SsrAgentProvider } from './SsrAgentContext';

interface ChatShellProvidersProps {
    children: ReactNode;
    mobileHeader?: ReactNode;
}

export default function ChatShellProviders({ children, mobileHeader }: ChatShellProvidersProps) {
    return (
        <AgentsProvider>
            <ChatProvider>
                <SsrAgentProvider>
                    {mobileHeader}
                    {children}
                </SsrAgentProvider>
            </ChatProvider>
        </AgentsProvider>
    );
}
