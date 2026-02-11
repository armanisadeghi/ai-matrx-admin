'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ChatSidebar } from '@/features/public-chat/components/ChatSidebar';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';

// ============================================================================
// LAYOUT AGENT CONTEXT — shares selected agent from layout → pages
// ============================================================================

interface LayoutAgentContextValue {
    selectedAgent: AgentConfig;
}

const LayoutAgentContext = createContext<LayoutAgentContextValue | null>(null);

/** Hook for pages to read the layout-level selected agent */
export function useLayoutAgent(): AgentConfig {
    const ctx = useContext(LayoutAgentContext);
    if (!ctx) {
        // Fallback to default if not wrapped (shouldn't happen)
        return {
            promptId: DEFAULT_AGENTS[0].promptId,
            name: DEFAULT_AGENTS[0].name,
            description: DEFAULT_AGENTS[0].description,
            variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
        };
    }
    return ctx.selectedAgent;
}

// ============================================================================
// CHAT LAYOUT SHELL
// ============================================================================

/**
 * ChatLayoutShell - Client component that provides sidebar + routing for the chat.
 *
 * Manages:
 * - Sidebar with chat history (from cx_ tables)
 * - Navigation between new chat and existing conversations
 * - Active request ID derived from the URL
 * - Agent selection state (shared between sidebar and chat container)
 * - chatKey counter forces full ChatProvider remount on "New Chat"
 */
export default function ChatLayoutShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Key that increments on "new chat" — forces ChatProvider remount
    const [chatKey, setChatKey] = useState(0);

    // Derive active request ID from URL
    const activeRequestId = useMemo(() => {
        const match = pathname.match(/\/p\/chat\/([^/?]+)/);
        return match ? match[1] : null;
    }, [pathname]);

    // Agent selection state — shared between sidebar and chat
    const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(() => ({
        promptId: DEFAULT_AGENTS[0].promptId,
        name: DEFAULT_AGENTS[0].name,
        description: DEFAULT_AGENTS[0].description,
        variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
    }));

    const handleSelectChat = useCallback((requestId: string) => {
        router.push(`/p/chat/${requestId}`);
    }, [router]);

    const handleNewChat = useCallback(() => {
        // Reset agent to default "General Chat"
        setSelectedAgent({
            promptId: DEFAULT_AGENTS[0].promptId,
            name: DEFAULT_AGENTS[0].name,
            description: DEFAULT_AGENTS[0].description,
            variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
        });
        // If already on /p/chat (no sub-route), bump chatKey to force remount
        if (!activeRequestId) {
            setChatKey(prev => prev + 1);
        } else {
            router.push('/p/chat');
        }
    }, [activeRequestId, router]);

    const handleAgentSelect = useCallback((agent: AgentConfig) => {
        setSelectedAgent(agent);
        // Selecting an agent starts a new conversation
        if (!activeRequestId) {
            setChatKey(prev => prev + 1);
        } else {
            router.push('/p/chat');
        }
    }, [activeRequestId, router]);

    // Context value for pages
    const agentContextValue = useMemo(() => ({ selectedAgent }), [selectedAgent]);

    return (
        <LayoutAgentContext.Provider value={agentContextValue}>
            <div className="h-full w-full flex flex-col">
                {/* Sidebar renders: mobile sub-header (in flow) + drawers/panels (fixed) */}
                <ChatSidebar
                    activeRequestId={activeRequestId}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    onAgentSelect={handleAgentSelect}
                    selectedAgent={selectedAgent}
                />
                {/* Main content — key forces remount on new chat / agent change */}
                <div className="flex-1 min-h-0 relative" key={chatKey}>
                    {children}
                </div>
            </div>
        </LayoutAgentContext.Provider>
    );
}
