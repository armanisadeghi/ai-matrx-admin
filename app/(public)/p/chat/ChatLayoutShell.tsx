'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ChatSidebar } from '@/features/public-chat/components/ChatSidebar';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import { ChatProvider, useChatContext } from '@/features/public-chat/context/ChatContext';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';
import { useAgentsContext } from '@/features/public-chat/context/AgentsContext';
import { useChatPersistence } from '@/features/public-chat/hooks/useChatPersistence';
import { processDbMessagesForDisplay } from '@/features/public-chat/utils/cx-content-converter';

// ============================================================================
// RESOLVE AGENT HELPER
// ============================================================================

function resolveAgentFromId(
    agentId: string | null,
    userPrompts: { id: string; name: string; description: string | null; variable_defaults: any[] | null }[] = [],
): AgentConfig | null {
    if (!agentId) return null;

    const systemAgent = DEFAULT_AGENTS.find(a => a.promptId === agentId);
    if (systemAgent) {
        return {
            promptId: systemAgent.promptId,
            name: systemAgent.name,
            description: systemAgent.description,
            variableDefaults: systemAgent.variableDefaults,
        };
    }

    const userAgent = userPrompts.find(p => p.id === agentId);
    if (userAgent) {
        return {
            promptId: userAgent.id,
            name: userAgent.name || 'Untitled',
            description: userAgent.description || undefined,
            variableDefaults: userAgent.variable_defaults || undefined,
        };
    }

    return null;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
    promptId: DEFAULT_AGENTS[0].promptId,
    name: DEFAULT_AGENTS[0].name,
    description: DEFAULT_AGENTS[0].description,
    variableDefaults: DEFAULT_AGENTS[0].variableDefaults,
};

// ============================================================================
// LAYOUT AGENT CONTEXT
// ============================================================================

interface LayoutAgentContextValue {
    selectedAgent: AgentConfig;
    onAgentChange: (agent: AgentConfig) => void;
    activeConversationId: string | null;
    isLoadingConversation: boolean;
}

const LayoutAgentContext = createContext<LayoutAgentContextValue | null>(null);

export function useLayoutAgent(): LayoutAgentContextValue {
    const ctx = useContext(LayoutAgentContext);
    if (!ctx) {
        return {
            selectedAgent: DEFAULT_AGENT_CONFIG,
            onAgentChange: () => {},
            activeConversationId: null,
            isLoadingConversation: false,
        };
    }
    return ctx;
}

// ============================================================================
// INNER SHELL — lives inside ChatProvider, manages URL-driven state
// ============================================================================

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const {
        state, setAgent, startNewConversation,
        setDbConversationId, setMessages,
    } = useChatContext();

    const { loadConversation } = useChatPersistence();
    const { userPrompts } = useAgentsContext();

    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const loadedConversationRef = useRef<string | null>(null);

    // ── Derive URL state ──────────────────────────────────────────────────
    const urlConversationId = useMemo(() => {
        const match = pathname.match(/\/p\/chat\/c\/([^/?]+)/);
        return match ? match[1] : null;
    }, [pathname]);

    const urlAgentId = useMemo(() => {
        const agentMatch = pathname.match(/\/p\/chat\/a\/([^/?]+)/);
        if (agentMatch) return agentMatch[1];
        return searchParams.get('agent');
    }, [pathname, searchParams]);

    const activeConversationId = urlConversationId;

    // ── Agent selection state ─────────────────────────────────────────────
    const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(() => {
        return resolveAgentFromId(urlAgentId) || DEFAULT_AGENT_CONFIG;
    });

    // Sync agent to chat context when it changes
    useEffect(() => {
        setAgent(selectedAgent);
    }, [selectedAgent, setAgent]);

    // Resolve agent from user prompts when they load (for custom agent URLs)
    useEffect(() => {
        if (!urlAgentId || userPrompts.length === 0) return;
        if (selectedAgent.promptId === urlAgentId) return;

        const resolved = resolveAgentFromId(urlAgentId, userPrompts);
        if (resolved) {
            setSelectedAgent(resolved);
        }
    }, [urlAgentId, userPrompts, selectedAgent.promptId]);

    // Handle back/forward navigation changing the agent route
    useEffect(() => {
        if (!urlAgentId) return;
        if (urlAgentId === selectedAgent.promptId) return;

        const resolved = resolveAgentFromId(urlAgentId, userPrompts);
        if (resolved) {
            setSelectedAgent(resolved);
            // If navigating to a new agent route (not a conversation), reset chat
            if (!urlConversationId && state.messages.length > 0) {
                startNewConversation();
            }
        }
    }, [urlAgentId, urlConversationId]);

    // ── Conversation loading from URL ─────────────────────────────────────
    useEffect(() => {
        if (!urlConversationId) {
            loadedConversationRef.current = null;
            return;
        }

        // This is the conversation we just created (streaming in progress) — skip fetch
        if (state.dbConversationId === urlConversationId) {
            loadedConversationRef.current = urlConversationId;
            return;
        }

        // Already loaded this conversation — skip
        if (loadedConversationRef.current === urlConversationId) {
            return;
        }

        let cancelled = false;
        setIsLoadingConversation(true);

        (async () => {
            const data = await loadConversation(urlConversationId);
            if (cancelled) return;

            if (!data) {
                setIsLoadingConversation(false);
                return;
            }

            loadedConversationRef.current = urlConversationId;

            // Convert DB messages to display format
            const processedMessages = processDbMessagesForDisplay(data.messages);
            const chatMessages = processedMessages.map(msg => ({
                id: msg.id || crypto.randomUUID(),
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || new Date(),
                status: msg.status,
                toolUpdates: msg.toolUpdates?.length > 0 ? msg.toolUpdates : undefined,
                isCondensed: msg.isCondensed || undefined,
            }));

            // Reset state and load messages
            startNewConversation();
            setDbConversationId(urlConversationId);
            setMessages(chatMessages);

            // Resolve agent from ?agent= param if present
            const agentParam = searchParams.get('agent');
            if (agentParam) {
                const resolved = resolveAgentFromId(agentParam, userPrompts);
                if (resolved) setSelectedAgent(resolved);
            }

            setIsLoadingConversation(false);
        })();

        return () => { cancelled = true; };
    }, [urlConversationId, state.dbConversationId]);

    // ── When we're on the base /p/chat route (no agent, no conversation), reset if needed
    useEffect(() => {
        if (pathname === '/p/chat' && state.messages.length > 0 && !state.isStreaming) {
            startNewConversation();
            loadedConversationRef.current = null;
        }
    }, [pathname]);

    // ── Handler: Agent change (from sidebar, header, welcome buttons) ─────
    const handleAgentChange = useCallback((agent: AgentConfig) => {
        if (agent.promptId === selectedAgent.promptId && !activeConversationId) {
            return; // Same agent, already on new chat
        }
        setSelectedAgent(agent);
        setAgent(agent);
        startNewConversation();
        loadedConversationRef.current = null;
        router.push(`/p/chat/a/${agent.promptId}`);
    }, [router, setAgent, startNewConversation, selectedAgent.promptId, activeConversationId]);

    // ── Handler: Select existing chat from sidebar ────────────────────────
    const handleSelectChat = useCallback((id: string) => {
        router.push(`/p/chat/c/${id}`);
    }, [router]);

    // ── Handler: New chat — preserves current agent ───────────────────────
    const handleNewChat = useCallback(() => {
        startNewConversation();
        loadedConversationRef.current = null;
        router.push(`/p/chat/a/${selectedAgent.promptId}`);
    }, [router, selectedAgent.promptId, startNewConversation]);

    // ── Context value ─────────────────────────────────────────────────────
    const contextValue = useMemo<LayoutAgentContextValue>(() => ({
        selectedAgent,
        onAgentChange: handleAgentChange,
        activeConversationId,
        isLoadingConversation,
    }), [selectedAgent, handleAgentChange, activeConversationId, isLoadingConversation]);

    return (
        <LayoutAgentContext.Provider value={contextValue}>
            <div className="h-full w-full flex flex-col">
                <ChatSidebar
                    activeRequestId={activeConversationId}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    onAgentSelect={handleAgentChange}
                    selectedAgent={selectedAgent}
                />
                <div className="flex-1 min-h-0 relative">
                    {children}
                </div>
            </div>
        </LayoutAgentContext.Provider>
    );
}

// ============================================================================
// OUTER SHELL — wraps children with ChatProvider (single instance for all routes)
// ============================================================================

export default function ChatLayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Resolve initial agent from URL at mount time.
    // This runs once — subsequent agent changes are handled by ChatLayoutInner.
    const [initialAgent] = useState<AgentConfig>(() => {
        // Check /p/chat/a/[id]
        const agentMatch = pathname.match(/\/p\/chat\/a\/([^/?]+)/);
        if (agentMatch) {
            const resolved = resolveAgentFromId(agentMatch[1]);
            if (resolved) return resolved;
        }
        // Check ?agent= param (for /p/chat/c/[id]?agent=xxx)
        const agentParam = searchParams.get('agent');
        if (agentParam) {
            const resolved = resolveAgentFromId(agentParam);
            if (resolved) return resolved;
        }
        return DEFAULT_AGENT_CONFIG;
    });

    return (
        <ChatProvider initialAgent={initialAgent}>
            <ChatLayoutInner>{children}</ChatLayoutInner>
        </ChatProvider>
    );
}
