'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';
import { ChatSidebar } from '@/features/public-chat/components/ChatSidebar';
import { ChatMobileHeader } from '@/features/public-chat/components/ChatMobileHeader';
import { AgentPickerSheet } from '@/features/public-chat/components/AgentPickerSheet';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';
import { ChatProvider, useChatContext } from '@/features/public-chat/context/ChatContext';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';
import { LayoutAgentContext, LayoutAgentContextValue } from '@/features/public-chat/context/LayoutAgentContext';
import { useAgentsContext } from '@/features/public-chat/context/AgentsContext';
import { useChatPersistence } from '@/features/public-chat/hooks/useChatPersistence';
import { processDbMessagesForDisplay } from '@/features/public-chat/utils/cx-content-converter';
import { resolveAgentFromId, DEFAULT_AGENT_CONFIG } from '@/features/public-chat/utils/agent-resolver';

// Basic UUID v4 pattern for validating URL-derived IDs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const { userPrompts, sidebarEvents } = useAgentsContext();

    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [focusKey, setFocusKey] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
    const loadedConversationRef = useRef<string | null>(null);

    // ── Derive URL state ──────────────────────────────────────────────────
    const urlConversationId = (() => {
        const match = pathname.match(/\/p\/chat\/c\/([^/?]+)/);
        if (!match) return null;
        return UUID_RE.test(match[1]) ? match[1] : null;
    })();

    const urlAgentId = (() => {
        const agentMatch = pathname.match(/\/p\/chat\/a\/([^/?]+)/);
        if (agentMatch) return agentMatch[1];
        return searchParams.get('agent');
    })();

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
            if (!urlConversationId && state.messages.length > 0) {
                startNewConversation();
            }
        }
    }, [urlAgentId, urlConversationId]);

    // ── URL sync: when a new conversation is created, update URL immediately ─
    // This runs at layout level so router.replace never remounts ChatContainer.
    // The dbConversationId is set by ChatContainer on first message send, which
    // triggers this effect and pushes the canonical URL without interrupting streaming.
    useEffect(() => {
        if (!state.dbConversationId) return;
        if (urlConversationId === state.dbConversationId) return;
        if (isLoadingConversation) return;

        const params = new URLSearchParams();
        if (selectedAgent.promptId) params.set('agent', selectedAgent.promptId);
        const varsParam = searchParams.get('vars');
        if (varsParam) params.set('vars', varsParam);
        const qs = params.toString();

        router.replace(`/p/chat/c/${state.dbConversationId}${qs ? `?${qs}` : ''}`);

        // Notify sidebar that a new conversation exists
        const title = state.messages[0]?.content?.trim().slice(0, 80) || selectedAgent.name || 'New Chat';
        sidebarEvents.emit('conversation-created', { id: state.dbConversationId, title });
    }, [state.dbConversationId]);

    // ── Conversation loading from URL ─────────────────────────────────────
    useEffect(() => {
        if (!urlConversationId) {
            loadedConversationRef.current = null;
            setIsLoadingConversation(false);
            return;
        }

        // Already in context — Python server persisted it, messages are live.
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

            const processedMessages = processDbMessagesForDisplay(data.messages, data.toolCalls);
            const chatMessages = processedMessages.map(msg => ({
                id: msg.id || crypto.randomUUID(),
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp || new Date(),
                status: msg.status,
                toolUpdates: msg.toolUpdates?.length > 0 ? msg.toolUpdates : undefined,
                isCondensed: msg.isCondensed || undefined,
            }));

            startNewConversation();
            setDbConversationId(urlConversationId);
            setMessages(chatMessages);

            const agentParam = searchParams.get('agent');
            if (agentParam) {
                const resolved = resolveAgentFromId(agentParam, userPrompts);
                if (resolved) setSelectedAgent(resolved);
            }

            setIsLoadingConversation(false);
        })();

        return () => { cancelled = true; };
    }, [urlConversationId, state.dbConversationId]);

    // ── Reset when navigating to base /p/chat ─────────────────────────────
    useEffect(() => {
        if (pathname === '/p/chat' && state.messages.length > 0 && !state.isStreaming) {
            startNewConversation();
            loadedConversationRef.current = null;
        }
    }, [pathname]);

    // ── Handler: Agent change ─────────────────────────────────────────────
    const handleAgentChange = (agent: AgentConfig) => {
        if (agent.promptId === selectedAgent.promptId && !activeConversationId) return;
        setSelectedAgent(agent);
        setAgent(agent);
        startNewConversation();
        loadedConversationRef.current = null;
        setIsLoadingConversation(false);
        setFocusKey(k => k + 1);
        const varsParam = searchParams.get('vars');
        const qs = varsParam ? `?vars=${varsParam}` : '';
        router.push(`/p/chat/a/${agent.promptId}${qs}`);
    };

    // ── Handler: Select existing chat from sidebar ────────────────────────
    const handleSelectChat = (id: string) => {
        const params = new URLSearchParams();
        if (selectedAgent.promptId) params.set('agent', selectedAgent.promptId);
        const qs = params.toString();
        router.push(`/p/chat/c/${id}${qs ? `?${qs}` : ''}`);
    };

    // ── Handler: New chat ─────────────────────────────────────────────────
    const handleNewChat = () => {
        startNewConversation();
        loadedConversationRef.current = null;
        setIsLoadingConversation(false);
        const varsParam = searchParams.get('vars');
        const qs = varsParam ? `?vars=${varsParam}` : '';
        router.push(`/p/chat/a/${selectedAgent.promptId}${qs}`);
    };

    const openAgentPicker = () => setIsAgentPickerOpen(true);

    const contextValue: LayoutAgentContextValue = {
        selectedAgent,
        onAgentChange: handleAgentChange,
        activeConversationId,
        isLoadingConversation,
        focusKey,
        openAgentPicker,
    };

    return (
        <LayoutAgentContext.Provider value={contextValue}>
            {/* Hide the public-layout header — ChatMobileHeader replaces it */}
            <style>{`[data-public-header]{display:none!important}`}</style>

            <AgentPickerSheet
                open={isAgentPickerOpen}
                onOpenChange={setIsAgentPickerOpen}
                selectedAgent={selectedAgent}
                onSelect={handleAgentChange}
            />

            <div className="h-full w-full relative">
                <ChatMobileHeader
                    onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                    onNewChat={handleNewChat}
                    selectedAgent={selectedAgent}
                    onOpenAgentPicker={openAgentPicker}
                    isSidebarOpen={isSidebarOpen}
                />
                <ChatSidebar
                    activeRequestId={activeConversationId}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    onAgentSelect={handleAgentChange}
                    onOpenAgentPicker={openAgentPicker}
                    selectedAgent={selectedAgent}
                    isOpen={isSidebarOpen}
                    onOpenChange={setIsSidebarOpen}
                />
                <div className="h-full">
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

    // Resolve initial agent from URL at mount time only.
    // Subsequent agent changes are handled by ChatLayoutInner.
    const [initialAgent] = useState<AgentConfig>(() => {
        const agentMatch = pathname.match(/\/p\/chat\/a\/([^/?]+)/);
        if (agentMatch) {
            const resolved = resolveAgentFromId(agentMatch[1]);
            if (resolved) return resolved;
        }
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
