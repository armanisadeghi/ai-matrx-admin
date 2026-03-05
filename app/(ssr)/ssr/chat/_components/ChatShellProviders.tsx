'use client';

// ChatShellProviders — Wraps both sidebar and workspace with shared context.
// AgentsProvider supplies agent data to both the sidebar agent chips and header agent picker.
// ChatProvider manages conversation/message state shared across the workspace.
// ChatSidebarProvider manages sidebar open/close state.

import { AgentsProvider } from '@/features/public-chat/context/AgentsContext';
import { ChatProvider } from '@/features/public-chat/context/ChatContext';
import { ChatSidebarProvider } from './ChatSidebarContext';

export default function ChatShellProviders({ children }: { children: React.ReactNode }) {
    return (
        <AgentsProvider>
            <ChatProvider>
                <ChatSidebarProvider>
                    {children}
                </ChatSidebarProvider>
            </ChatProvider>
        </AgentsProvider>
    );
}
