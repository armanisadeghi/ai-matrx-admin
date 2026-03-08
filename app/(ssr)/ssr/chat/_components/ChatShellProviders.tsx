'use client';

// ChatShellProviders — Wraps both sidebar and workspace with shared context.
// AgentsProvider supplies agent data to both the sidebar agent chips and header agent picker.
// ChatProvider manages conversation/message state shared across the workspace.
// SsrAgentProvider manages selected agent state and syncs it to ChatContext + URL.
// ChatSidebarProvider manages sidebar open/close state.

import { AgentsProvider } from '@/features/public-chat/context/AgentsContext';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { ChatSidebarProvider } from './ChatSidebarContext';
import { SsrAgentProvider } from './SsrAgentContext';

export default function ChatShellProviders({ children }: { children: React.ReactNode }) {
    return (
        <AgentsProvider>
            <ChatProvider>
                {/* SsrAgentProvider must be inside ChatProvider — it calls useChatContext */}
                <SsrAgentProvider>
                    <ChatSidebarProvider>
                        {children}
                    </ChatSidebarProvider>
                </SsrAgentProvider>
            </ChatProvider>
        </AgentsProvider>
    );
}
