'use client';

// app/(ssr)/ssr/chat/_components/ChatWorkspace.tsx
// Main client island for the SSR chat route.
//
// Architecture:
//   - ChatContext (reducer) for message/agent/settings state
//   - useAgentChat for NDJSON streaming to the backend
//   - useChatPersistence for cx_ table CRUD via API routes
//   - useApiAuth for auth headers (from lite Redux store)
//   - URL state: pathname for conversationId, searchParams for agent/vars/localhost
//   - Custom DOM events for sidebar sync

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { MessageCircle, Share2, List, Layers } from 'lucide-react';

// Chat infrastructure
import { ChatProvider, useChatContext } from '@/features/public-chat/context/ChatContext';
import type { AgentConfig, ChatMessage } from '@/features/public-chat/context/ChatContext';
import { useAgentChat } from '@/features/public-chat/hooks/useAgentChat';
import { useChatPersistence } from '@/features/public-chat/hooks/useChatPersistence';
import { resolveAgentFromId, DEFAULT_AGENT_CONFIG } from '@/features/public-chat/utils/agent-resolver';

// Eager imports — always rendered in conversation mode
import { ChatInputWithControls } from '@/features/public-chat/components/ChatInputWithControls';
import { MessageList } from '@/features/public-chat/components/MessageDisplay';
import { AgentActionButtons, DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';

// Lazy imports — conditionally rendered, not needed on first paint
const ShareModal = dynamic(() => import('@/features/sharing').then(m => ({ default: m.ShareModal })), { ssr: false });
const PublicVariableInputs = dynamic(() => import('@/features/public-chat/components/PublicVariableInputs').then(m => ({ default: m.PublicVariableInputs })), { ssr: false });
const GuidedVariableInputs = dynamic(() => import('@/features/public-chat/components/GuidedVariableInputs').then(m => ({ default: m.GuidedVariableInputs })), { ssr: false });

import type { StreamEvent } from '@/types/python-generated/stream-events';
import type { PublicResource } from '@/features/public-chat/types/content';
import type { PromptVariable } from '@/features/prompts/types/core';
import { formatText } from '@/utils/text/text-case-converter';

// ============================================================================
// INNER WORKSPACE — wrapped by ChatProvider
// ============================================================================

function ChatWorkspaceInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { state, setAgent, setUseLocalhost, updateMessage, setDbConversationId, loadConversation: loadConversationAction, startNewConversation } = useChatContext();

    // Variables
    const useGuidedVars = searchParams.get('vars') !== 'classic';
    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    const [activeVariables, setActiveVariables] = useState<PromptVariable[]>([]);

    // Streaming
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const latestAssistantRef = useRef<HTMLDivElement>(null);
    const prevAssistantCountRef = useRef(0);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const variableInputRef = useRef<HTMLInputElement>(null);

    // Loading state for conversation switch
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [focusKey, setFocusKey] = useState(0);

    // Redux lite store — typed hooks
    const user = useAppSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const useLocalhost = useAppSelector(selectIsUsingLocalhost);

    // Persistence hook
    const persistence = useChatPersistence();

    // ========================================================================
    // URL STATE — extract conversation ID and agent ID
    // ========================================================================

    const conversationIdFromUrl = useMemo(() => {
        const match = pathname.match(/\/ssr\/chat\/([^/?]+)/);
        return match?.[1] ?? null;
    }, [pathname]);

    const agentIdFromUrl = searchParams.get('agent');
    const localhostFromUrl = searchParams.get('localhost') === '1';

    // ========================================================================
    // STREAMING — useAgentChat
    // ========================================================================

    const { sendMessage, isStreaming, isExecuting, messages, conversationId } = useAgentChat({
        onStreamEvent: (event) => {
            setStreamEvents(prev => [...prev, event]);
        },
        onComplete: () => {
            setTimeout(() => setStreamEvents([]), 100);

            // Notify sidebar of update
            if (state.dbConversationId) {
                window.dispatchEvent(new CustomEvent('chat:conversationUpdated', {
                    detail: { id: state.dbConversationId },
                }));
            }
        },
        onError: () => {
            // useAgentChat handles error state internally
        },
    });

    // ========================================================================
    // SYNC EFFECTS
    // ========================================================================

    // Sync localhost preference
    useEffect(() => {
        setUseLocalhost(useLocalhost || localhostFromUrl);
    }, [useLocalhost, localhostFromUrl, setUseLocalhost]);

    // Resolve agent from URL param
    useEffect(() => {
        if (agentIdFromUrl) {
            const resolved = resolveAgentFromId(agentIdFromUrl);
            if (resolved) {
                setAgent(resolved);
                setFocusKey(k => k + 1);
                return;
            }
        }
        // Default agent if none set
        if (!state.currentAgent) {
            setAgent(DEFAULT_AGENT_CONFIG);
        }
    }, [agentIdFromUrl]);

    // Load conversation when URL changes to a conversation route
    useEffect(() => {
        if (!conversationIdFromUrl) {
            // No conversation in URL — reset to welcome screen
            if (state.dbConversationId) {
                startNewConversation();
            }
            return;
        }

        // Already loaded?
        if (state.dbConversationId === conversationIdFromUrl) {
            return;
        }

        let cancelled = false;

        async function doLoadConversation() {
            setIsLoadingConversation(true);
            try {
                const data = await persistence.loadConversation(conversationIdFromUrl!);
                if (cancelled || !data) {
                    setIsLoadingConversation(false);
                    return;
                }

                // Convert cx_messages to ChatMessage format
                const chatMessages: ChatMessage[] = data.messages.map(msg => {
                    const textContent = msg.content
                        .filter(block => block.type === 'text')
                        .map(block => ('text' in block ? block.text : ''))
                        .join('\n');

                    return {
                        id: msg.id,
                        role: msg.role as 'user' | 'assistant',
                        content: textContent,
                        status: 'complete' as const,
                        timestamp: new Date(msg.created_at),
                    };
                });

                // Load atomically — sets conversationId, dbConversationId, and messages in one dispatch
                loadConversationAction(conversationIdFromUrl!, conversationIdFromUrl!, chatMessages);

                setIsLoadingConversation(false);
                setFocusKey(k => k + 1);
            } catch (error) {
                console.error('Failed to load conversation:', error);
                setIsLoadingConversation(false);
            }
        }

        doLoadConversation();

        return () => {
            cancelled = true;
        };
    }, [conversationIdFromUrl]);

    // Update URL when dbConversationId changes (new conversation created via streaming)
    useEffect(() => {
        if (!state.dbConversationId) return;
        if (conversationIdFromUrl === state.dbConversationId) return;

        // New conversation created — update URL
        const url = `/ssr/chat/${state.dbConversationId}`;
        window.history.pushState(null, '', url);

        // Notify sidebar
        const title = state.messages[0]?.content?.slice(0, 60) || 'New Chat';
        window.dispatchEvent(new CustomEvent('chat:conversationCreated', {
            detail: { id: state.dbConversationId, title },
        }));
    }, [state.dbConversationId]);

    // ========================================================================
    // VARIABLE MANAGEMENT
    // ========================================================================

    const hasMessages = state.messages.length > 0;

    useEffect(() => {
        const agent = state.currentAgent;
        if (!agent) {
            setAgent(DEFAULT_AGENT_CONFIG);
        }

        if (hasMessages) {
            setActiveVariables([]);
            setVariableValues({});
            return;
        }

        const varDefs = (agent || DEFAULT_AGENTS[0]).variableDefaults;
        if (varDefs && varDefs.length > 0) {
            setActiveVariables(varDefs);
            const initialValues: Record<string, string> = {};
            varDefs.forEach(variable => {
                if (variable.defaultValue) {
                    initialValues[variable.name] = variable.defaultValue;
                }
            });
            setVariableValues(initialValues);
        } else {
            setActiveVariables([]);
            setVariableValues({});
        }
    }, [state.currentAgent?.promptId, hasMessages]);

    // Focus management — use refs, skip on mobile
    useEffect(() => {
        if (isLoadingConversation) return;

        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isMobile) return;

        const timer = setTimeout(() => {
            if (activeVariables.length > 0 && variableInputRef.current) {
                variableInputRef.current.focus();
            } else if (textInputRef.current) {
                textInputRef.current.focus();
            }
        }, 80);

        return () => clearTimeout(timer);
    }, [state.currentAgent?.promptId, focusKey, isLoadingConversation, activeVariables.length]);

    // Auto-scroll to latest assistant message
    useEffect(() => {
        const assistantCount = messages.filter(m => m.role === 'assistant').length;
        if (assistantCount > prevAssistantCountRef.current && latestAssistantRef.current) {
            latestAssistantRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        prevAssistantCountRef.current = assistantCount;
    }, [messages]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleAgentSelect = useCallback((agent: typeof DEFAULT_AGENTS[0]) => {
        setAgent({
            promptId: agent.promptId,
            name: agent.name,
            description: agent.description,
            variableDefaults: agent.variableDefaults,
        });

        // Update URL with agent param
        const params = new URLSearchParams(searchParams.toString());
        params.set('agent', agent.promptId);
        const url = `/ssr/chat?${params.toString()}`;
        window.history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));

        setFocusKey(k => k + 1);
    }, [searchParams, setAgent]);

    const handleVariableChange = useCallback((name: string, value: string) => {
        setVariableValues(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(async (content: string, resources?: PublicResource[]) => {
        setStreamEvents([]);

        let displayContent = '';

        if (activeVariables.length > 0) {
            const variableLines: string[] = [];
            activeVariables.forEach(varDef => {
                const value = variableValues[varDef.name] || varDef.defaultValue || '';
                if (value) {
                    const formattedName = formatText(varDef.name);
                    variableLines.push(`${formattedName}: ${value}`);
                }
            });

            if (variableLines.length > 0) {
                displayContent = variableLines.join('\n');
                if (content.trim()) {
                    displayContent += '\n\n' + content;
                }
            } else {
                displayContent = content;
            }
        } else {
            displayContent = content;
        }

        const submittedVariables = { ...variableValues };
        setActiveVariables([]);
        setVariableValues({});

        return sendMessage({
            content: displayContent,
            variables: submittedVariables,
            resources,
        });
    }, [activeVariables, variableValues, sendMessage]);

    const handleMessageContentChange = useCallback((messageId: string, newContent: string) => {
        updateMessage(messageId, { content: newContent });
    }, [updateMessage]);

    const openAgentPicker = useCallback(() => {
        // No-op — agent selection via sidebar chips + action buttons
    }, []);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================

    const currentAgentOption = DEFAULT_AGENTS.find(a => a.promptId === state.currentAgent?.promptId) || DEFAULT_AGENTS[0];
    const hasVariables = activeVariables.length > 0;
    const isWelcomeScreen = messages.length === 0 && !isLoadingConversation;

    // ========================================================================
    // LOADING STATE
    // ========================================================================

    if (isLoadingConversation) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary animate-pulse mb-3" />
                <p className="text-sm text-muted-foreground">Loading conversation...</p>
            </div>
        );
    }

    // ========================================================================
    // WELCOME SCREEN
    // ========================================================================

    if (isWelcomeScreen) {
        const agentName = hasVariables ? state.currentAgent?.name : null;
        const agentDescription = hasVariables ? state.currentAgent?.description : null;
        const varCount = activeVariables.length;
        const showDescription = agentDescription && varCount <= 3;

        const toggleUrl = (() => {
            const params = new URLSearchParams(searchParams.toString());
            if (useGuidedVars) {
                params.set('vars', 'classic');
            } else {
                params.delete('vars');
            }
            const qs = params.toString();
            return qs ? `?${qs}` : pathname;
        })();

        // Guided mode: pin input to bottom
        if (useGuidedVars && hasVariables) {
            return (
                <div className="h-full flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="flex flex-col items-center justify-end min-h-full px-3 md:px-8 pb-4">
                            <div className="w-full max-w-3xl text-center">
                                <h1 className={`font-semibold text-foreground ${varCount > 2 ? 'text-xl md:text-3xl' : 'text-2xl md:text-3xl'}`}>
                                    {agentName || 'What can I help with?'}
                                </h1>
                                {showDescription && (
                                    <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                        {agentDescription}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex-shrink-0 px-2 md:px-4 bg-transparent"
                        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
                    >
                        <div className="w-full max-w-3xl mx-auto">
                            <GuidedVariableInputs
                                variableDefaults={activeVariables}
                                values={variableValues}
                                onChange={handleVariableChange}
                                disabled={isExecuting}
                                textInputRef={textInputRef}
                                submitOnEnter={true}
                                onSubmit={handleSubmit}
                                seamless
                            />
                            <div className="rounded-b-2xl bg-card/80 backdrop-blur-sm">
                                <ChatInputWithControls
                                    onSubmit={handleSubmit}
                                    disabled={isExecuting}
                                    placeholder="Additional instructions (optional)…"
                                    conversationId={conversationId}
                                    onOpenAgentPicker={openAgentPicker}
                                    hasVariables={hasVariables}
                                    selectedAgent={state.currentAgent}
                                    textInputRef={textInputRef}
                                    seamless
                                />
                            </div>
                            <div className="flex items-center justify-between mt-3 pb-2">
                                <AgentActionButtons
                                    agents={DEFAULT_AGENTS}
                                    selectedAgent={currentAgentOption}
                                    onSelect={handleAgentSelect}
                                    disabled={isExecuting}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.history.pushState(null, '', toggleUrl);
                                        window.dispatchEvent(new PopStateEvent('popstate'));
                                    }}
                                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                                    title="Switch to classic variable view"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Classic mode (or no variables): centered layout
        return (
            <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className={`min-h-full flex flex-col items-center px-3 md:px-8 ${varCount > 2 ? 'justify-start pt-8 md:pt-16 md:justify-center' : 'justify-center'}`}>
                        <div className="w-full max-w-3xl">
                            <div className={`text-center ${varCount > 2 ? 'mb-3 md:mb-6' : 'mb-6 md:mb-8'}`}>
                                <h1 className={`font-semibold text-foreground ${varCount > 2 ? 'text-xl md:text-3xl' : 'text-2xl md:text-3xl'}`}>
                                    {agentName || 'What can I help with?'}
                                </h1>
                                {showDescription ? (
                                    <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                        {agentDescription}
                                    </p>
                                ) : !hasVariables ? (
                                    <p className="mt-1 text-sm text-muted-foreground/70">
                                        AI with Matrx superpowers
                                    </p>
                                ) : null}
                            </div>

                            {hasVariables && (
                                <div className={varCount > 2 ? 'mb-3 md:mb-6' : 'mb-6'}>
                                    <PublicVariableInputs
                                        variableDefaults={activeVariables}
                                        values={variableValues}
                                        onChange={handleVariableChange}
                                        disabled={isExecuting}
                                        minimal
                                        textInputRef={textInputRef}
                                        submitOnEnter={true}
                                        onSubmit={handleSubmit}
                                    />
                                </div>
                            )}

                            <div>
                                <ChatInputWithControls
                                    onSubmit={handleSubmit}
                                    disabled={isExecuting}
                                    placeholder={hasVariables ? 'Additional instructions (optional)…' : 'What do you want to know?'}
                                    conversationId={conversationId}
                                    onOpenAgentPicker={openAgentPicker}
                                    hasVariables={hasVariables}
                                    selectedAgent={state.currentAgent}
                                    textInputRef={textInputRef}
                                />
                            </div>

                            <div className="flex items-center justify-between mt-3 md:mt-6 pb-4">
                                <AgentActionButtons
                                    agents={DEFAULT_AGENTS}
                                    selectedAgent={currentAgentOption}
                                    onSelect={handleAgentSelect}
                                    disabled={isExecuting}
                                />
                                {hasVariables && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.history.pushState(null, '', toggleUrl);
                                            window.dispatchEvent(new PopStateEvent('popstate'));
                                        }}
                                        className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
                                        title="Switch to guided variable view"
                                    >
                                        <Layers className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // CONVERSATION MODE
    // ========================================================================

    const shareConversationId = state.dbConversationId;
    const conversationTitle = state.messages[0]?.content?.slice(0, 60) || 'Chat';

    return (
        <div className="h-full flex flex-col">
            {/* Share Modal — lazy-loaded, only rendered on click */}
            {isShareOpen && shareConversationId && (
                <ShareModal
                    isOpen={isShareOpen}
                    onClose={() => setIsShareOpen(false)}
                    resourceType="cx_conversation"
                    resourceId={shareConversationId}
                    resourceName={conversationTitle}
                    isOwner={true}
                />
            )}

            {/* Messages area */}
            <div className="flex-1 min-h-0 relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background/60 to-transparent z-10 pointer-events-none" />

                <div className="h-full overflow-y-auto chat-messages-scroll">
                    <div className="w-full max-w-[800px] mx-auto px-3 pt-12 pb-2 md:px-3 md:pt-12 md:pb-4 relative">
                        {isAuthenticated && shareConversationId && (
                            <div className="absolute top-1 right-3 z-10 hidden md:block">
                                <button
                                    onClick={() => setIsShareOpen(true)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                                    title="Share conversation"
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <MessageList
                            messages={messages}
                            streamEvents={streamEvents.length > 0 ? streamEvents : undefined}
                            isStreaming={isStreaming}
                            onMessageContentChange={handleMessageContentChange}
                            latestAssistantRef={latestAssistantRef}
                        />
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/40 to-transparent z-10 pointer-events-none md:hidden" />
            </div>

            {/* Input area */}
            <div
                className="flex-shrink-0 px-2 md:px-4 md:pt-2 bg-transparent"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="w-full max-w-[800px] mx-auto">
                    {hasVariables && useGuidedVars && (
                        <GuidedVariableInputs
                            variableDefaults={activeVariables}
                            values={variableValues}
                            onChange={handleVariableChange}
                            disabled={isExecuting}
                            textInputRef={textInputRef}
                            submitOnEnter={true}
                            onSubmit={handleSubmit}
                            seamless
                        />
                    )}
                    {hasVariables && !useGuidedVars && (
                        <div className="mb-2">
                            <PublicVariableInputs
                                variableDefaults={activeVariables}
                                values={variableValues}
                                onChange={handleVariableChange}
                                disabled={isExecuting}
                                minimal
                                textInputRef={textInputRef}
                                submitOnEnter={true}
                                onSubmit={handleSubmit}
                            />
                        </div>
                    )}
                    <div className={`bg-card/80 backdrop-blur-sm ${hasVariables && useGuidedVars ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
                        <ChatInputWithControls
                            onSubmit={handleSubmit}
                            disabled={isExecuting}
                            conversationId={conversationId}
                            onOpenAgentPicker={openAgentPicker}
                            hasVariables={hasVariables}
                            selectedAgent={state.currentAgent}
                            textInputRef={textInputRef}
                            seamless={hasVariables && useGuidedVars}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// OUTER WRAPPER — provides ChatContext
// ============================================================================

export default function ChatWorkspace() {
    return (
        <ChatProvider>
            <ChatWorkspaceInner />
        </ChatProvider>
    );
}
