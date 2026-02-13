'use client';

import { useRouter, usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ChatSidebar } from '@/features/public-chat/components/ChatSidebar';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';

// ============================================================================
// LAYOUT AGENT CONTEXT — single source of truth for agent state
// ============================================================================

interface LayoutAgentContextValue {
    /** Current agent selection */
    selectedAgent: AgentConfig;
    /**
     * Change agent — from ANY component (sidebar, header, input, action buttons).
     * This is the ONLY way to change agents. It handles:
     * - Updating layout state (sidebar, header, floating selector)
     * - Navigating to the correct URL
     * - Forcing ChatProvider remount so inner context picks up new agent
     */
    onAgentChange: (agent: AgentConfig) => void;
    /** Active conversation ID (derived from URL), or null for new chat */
    activeConversationId: string | null;
}

const LayoutAgentContext = createContext<LayoutAgentContextValue | null>(null);

/** Hook for pages and components to read/change the agent */
export function useLayoutAgent(): LayoutAgentContextValue {
    const ctx = useContext(LayoutAgentContext);
    if (!ctx) {
        // Fallback — shouldn't happen in practice
        return {
            selectedAgent: {
                promptId: DEFAULT_AGENTS[0].promptId,
                name: DEFAULT_AGENTS[0].name,
                description: DEFAULT_AGENTS[0].description,
                variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
            },
            onAgentChange: () => {},
            activeConversationId: null,
        };
    }
    return ctx;
}

// ============================================================================
// CHAT LAYOUT SHELL
// ============================================================================

/**
 * ChatLayoutShell — Client component that is the SINGLE SOURCE OF TRUTH
 * for agent selection across the entire /p/chat route tree.
 *
 * Every agent picker (sidebar list, header dropdown, floating dropdown,
 * input-area prompt picker, welcome-screen action buttons) calls
 * `onAgentChange` from context. No component manages its own agent state.
 *
 * State flow:
 *   User selects agent → onAgentChange() → updates selectedAgent state
 *   → bumps chatKey (remounts ChatProvider with new initialAgent)
 *   → all UI reads from context and stays in sync
 */
export default function ChatLayoutShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Key that increments to force ChatProvider remount
    const [chatKey, setChatKey] = useState(0);

    // Derive active conversation ID from URL
    // /p/chat/c/[id] → conversation mode
    // /p/chat/[requestId] → legacy conversation mode
    // /p/chat or /p/chat/a/[id] → new chat mode (no existing conversation)
    const activeConversationId = useMemo(() => {
        const convMatch = pathname.match(/\/p\/chat\/c\/([^/?]+)/);
        if (convMatch) return convMatch[1];

        const agentMatch = pathname.match(/\/p\/chat\/a\/([^/?]+)/);
        if (agentMatch) return null; // Agent route = new chat, no conversation

        const legacyMatch = pathname.match(/\/p\/chat\/([^/?]+)/);
        if (legacyMatch) return legacyMatch[1];

        return null;
    }, [pathname]);

    // Agent selection state — THE single source of truth
    const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(() => {
        // If on an agent route, initialize from URL
        const agentMatch = pathname.match(/\/p\/chat\/a\/([^/?]+)/);
        if (agentMatch) {
            const found = DEFAULT_AGENTS.find(a => a.promptId === agentMatch[1]);
            if (found) return {
                promptId: found.promptId,
                name: found.name,
                description: found.description,
                variableDefaults: found.variableDefaults,
            };
        }
        return {
            promptId: DEFAULT_AGENTS[0].promptId,
            name: DEFAULT_AGENTS[0].name,
            description: DEFAULT_AGENTS[0].description,
            variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
        };
    });

    // ────────────────────────────────────────────────────────────────────────
    // UNIFIED AGENT CHANGE HANDLER
    // Called from: sidebar agent list, header dropdown, floating dropdown,
    //             input prompt picker, welcome-screen action buttons
    // ────────────────────────────────────────────────────────────────────────
    const handleAgentChange = useCallback((agent: AgentConfig) => {
        setSelectedAgent(agent);

        // If we're inside an existing conversation, stay there but update agent.
        // The ChatProvider remount (via chatKey bump) will pick up the new agent.
        if (activeConversationId) {
            setChatKey(prev => prev + 1);
        } else {
            // On /p/chat or /p/chat/a/xxx — just bump the key to remount
            // with new agent. No navigation needed since we're already on
            // a "new chat" route.
            setChatKey(prev => prev + 1);
        }
    }, [activeConversationId]);

    // ────────────────────────────────────────────────────────────────────────
    // SIDEBAR HANDLERS
    // ────────────────────────────────────────────────────────────────────────
    const handleSelectChat = useCallback((requestId: string) => {
        router.push(`/p/chat/c/${requestId}`);
    }, [router]);

    const handleNewChat = useCallback(() => {
        // Preserve the current agent — start fresh conversation with same agent
        if (!activeConversationId) {
            // Already on /p/chat — bump key to force remount
            setChatKey(prev => prev + 1);
        } else {
            // Navigate away from conversation back to base chat
            router.push('/p/chat');
        }
    }, [activeConversationId, router]);

    // ────────────────────────────────────────────────────────────────────────
    // CONTEXT VALUE — shared with all descendants
    // ────────────────────────────────────────────────────────────────────────
    const contextValue = useMemo<LayoutAgentContextValue>(() => ({
        selectedAgent,
        onAgentChange: handleAgentChange,
        activeConversationId,
    }), [selectedAgent, handleAgentChange, activeConversationId]);

    return (
        <LayoutAgentContext.Provider value={contextValue}>
            <div className="h-full w-full flex flex-col">
                {/* Sidebar — reads selectedAgent + onAgentChange from context */}
                <ChatSidebar
                    activeRequestId={activeConversationId}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    onAgentSelect={handleAgentChange}
                    selectedAgent={selectedAgent}
                />
                {/* Main content — key forces full ChatProvider remount */}
                <div className="flex-1 min-h-0 relative" key={chatKey}>
                    {children}
                </div>
            </div>
        </LayoutAgentContext.Provider>
    );
}
