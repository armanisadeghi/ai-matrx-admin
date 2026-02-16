'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { useChatContext } from '../context/ChatContext';
import { useAgentsContext } from '../context/AgentsContext';
import { useAgentChat } from '../hooks/useAgentChat';
import { ChatInputWithControls } from './ChatInputWithControls';
import { MessageList } from './MessageDisplay';
import { PublicVariableInputs } from './PublicVariableInputs';
import { GuidedVariableInputs } from './GuidedVariableInputs';
import { AgentActionButtons, DEFAULT_AGENTS } from './AgentSelector';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { formatText } from '@/utils/text/text-case-converter';
import type { PublicResource } from '../types/content';
import type { PromptVariable } from '@/features/prompts/types/core';
import { MessageCircle, Share2, List, Layers } from 'lucide-react';
import { ShareModal } from '@/features/sharing';
import { useLayoutAgent } from '@/app/(public)/p/chat/ChatLayoutShell';

// ============================================================================
// TYPES
// ============================================================================

interface ChatContainerProps {
    className?: string;
}

// ============================================================================
// CHAT CONTAINER
// ============================================================================

export function ChatContainer({ className = '' }: ChatContainerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { state, setAgent, addMessage, setUseLocalhost, updateMessage, setDbConversationId } = useChatContext();
    const { onAgentChange, isLoadingConversation, focusKey, openAgentPicker } = useLayoutAgent();
    const { sidebarEvents } = useAgentsContext();

    // Default to guided mode; ?vars=classic → stacked rows
    const useGuidedVars = searchParams.get('vars') !== 'classic';

    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    // Active variable definitions currently shown in the UI. Starts from the
    // agent's defaults and is cleared after the first submit. In the future,
    // the AI agent can push new variables mid-conversation by setting this.
    const [activeVariables, setActiveVariables] = useState<PromptVariable[]>([]);
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const latestAssistantRef = useRef<HTMLDivElement>(null);
    const prevAssistantCountRef = useRef(0);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    // Ref for accessing dbConversationId in callbacks (avoids stale closure)
    const dbConvIdRef = useRef<string | null>(state.dbConversationId);
    // Deferred URL update — stored during handleSubmit, applied in onComplete.
    // router.replace during an active stream would remount ChatContainer (page
    // component changes from /p/chat to /p/chat/c/[id]), destroying streamEvents
    // and the onStreamEvent callback, which kills real-time tool visualization.
    const pendingUrlRef = useRef<string | null>(null);

    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const useLocalhost = useSelector(selectIsUsingLocalhost);

    // Keep ref in sync with state
    useEffect(() => {
        dbConvIdRef.current = state.dbConversationId;
    }, [state.dbConversationId]);

    const { sendMessage, warmAgent, isStreaming, isExecuting, messages, conversationId } = useAgentChat({
        onStreamEvent: (event) => {
            setStreamEvents((prev) => [...prev, event]);
        },
        onComplete: () => {
            setTimeout(() => setStreamEvents([]), 100);
            // Notify sidebar that this conversation was updated (Python server
            // handles actual DB persistence — we only update the sidebar UI).
            if (dbConvIdRef.current) {
                sidebarEvents.emit('conversation-updated', { id: dbConvIdRef.current });
            }
            // Apply deferred URL update now that the stream is complete.
            // Doing this during the stream would remount ChatContainer and
            // destroy streamEvents / tool call visualizations.
            if (pendingUrlRef.current) {
                router.replace(pendingUrlRef.current);
                pendingUrlRef.current = null;
            }
        },
        onError: (error) => {
            console.error('Chat error:', error);
            // Apply deferred URL even on error — the conversation was already
            // sent to the Python server before the stream started.
            if (pendingUrlRef.current) {
                router.replace(pendingUrlRef.current);
                pendingUrlRef.current = null;
            }
        },
    });

    // Sync Redux server preference to chat context
    useEffect(() => {
        setUseLocalhost(useLocalhost);
    }, [useLocalhost, setUseLocalhost]);

    // Initialize variables from current agent on mount or agent change.
    // Only populate activeVariables for a fresh conversation (no messages).
    // Once the user has submitted, activeVariables is cleared by handleSubmit
    // and should stay empty until the agent changes or a new conversation starts.
    const hasMessages = state.messages.length > 0;

    useEffect(() => {
        const agent = state.currentAgent;
        if (!agent) {
            const defaultAgent = DEFAULT_AGENTS[0];
            setAgent({
                promptId: defaultAgent.promptId,
                name: defaultAgent.name,
                description: defaultAgent.description,
                variableDefaults: defaultAgent.variableDefaults,
            });
        }

        // If there are already messages, the initial variables have been
        // consumed — don't re-populate them.
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

    // Focus the first available input whenever the agent changes, on initial load,
    // or when a conversation finishes loading.
    // When the agent has variables → focus the first variable input.
    // When the agent has no variables → focus the main textarea.
    // Skip on mobile — auto-focusing opens the keyboard and hides half the screen.
    // Uses retries because agent change triggers router.push() which re-mounts components,
    // meaning the DOM elements may not exist yet when this effect first fires.
    useEffect(() => {
        // Don't attempt focus while a conversation is loading (loading spinner shown)
        if (isLoadingConversation) return;

        // Skip auto-focus on mobile/touch devices — opening the keyboard
        // on page load hides ~50% of the viewport and is disorienting.
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isMobile) return;

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 8;

        function tryFocus() {
            if (cancelled) return;
            attempts++;

            if (activeVariables.length > 0) {
                const container = document.querySelector('[data-variable-inputs]');
                const firstInput = container?.querySelector<HTMLInputElement>('[data-variable-index="0"]');
                if (firstInput) {
                    firstInput.focus();
                    return;
                }
            }
            // No variables or conversation mode — focus the textarea
            if (textInputRef.current) {
                textInputRef.current.focus();
                return;
            }

            // Element not in DOM yet — retry with increasing delay
            if (attempts < maxAttempts) {
                setTimeout(tryFocus, attempts * 50);
            }
        }

        // Start after a short delay to let React flush the render
        const timer = setTimeout(tryFocus, 50);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [state.currentAgent?.promptId, focusKey, isLoadingConversation]);

    // Pre-warm agent
    useEffect(() => {
        if (state.currentAgent?.promptId) {
            warmAgent(state.currentAgent.promptId);
        }
    }, [state.currentAgent?.promptId, warmAgent]);

    // One-time scroll when a NEW assistant message appears
    useEffect(() => {
        const assistantCount = messages.filter(m => m.role === 'assistant').length;
        if (assistantCount > prevAssistantCountRef.current && latestAssistantRef.current) {
            latestAssistantRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        prevAssistantCountRef.current = assistantCount;
    }, [messages]);

    // Agent selection — delegates to layout context
    const handleAgentSelect = useCallback(
        (agent: typeof DEFAULT_AGENTS[0]) => {
            onAgentChange({
                promptId: agent.promptId,
                name: agent.name,
                description: agent.description,
                variableDefaults: agent.variableDefaults,
            });
        },
        [onAgentChange]
    );

    const handleVariableChange = useCallback((name: string, value: string) => {
        setVariableValues((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(
        async (content: string, resources?: PublicResource[]) => {
            setStreamEvents([]);

            // On first message, use the context's conversationId (the same UUID
            // sent to the Python backend) as the canonical conversation ID.
            // We do NOT create a DB row — the Python server handles that.
            if (!dbConvIdRef.current) {
                const convId = state.conversationId;
                dbConvIdRef.current = convId;
                setDbConversationId(convId);

                // Build URL params preserving current state
                const params = new URLSearchParams();
                if (state.currentAgent?.promptId) {
                    params.set('agent', state.currentAgent.promptId);
                }
                const varsParam = searchParams.get('vars');
                if (varsParam) {
                    params.set('vars', varsParam);
                }
                const qs = params.toString();
                const targetUrl = `/p/chat/c/${convId}${qs ? `?${qs}` : ''}`;

                // Defer URL update until stream completes — doing router.replace
                // now would remount ChatContainer (page changes from /p/chat to
                // /p/chat/c/[id]), destroying streamEvents and killing real-time
                // tool call visualization.
                // Note: no ?new=1 needed here — by the time this URL is applied
                // (onComplete), the Python server has already persisted the
                // conversation. The dbConversationId === urlConversationId check
                // in ChatLayoutShell handles skipping the fetch during transition.
                pendingUrlRef.current = targetUrl;

                // Notify sidebar immediately with the same ID Python will use
                const title = (content?.trim().slice(0, 80) || state.currentAgent?.name || 'New Chat');
                sidebarEvents.emit('conversation-created', { id: convId, title });
            }

            // Format message content with variables for display
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

            // Capture current variable values before clearing
            const submittedVariables = { ...variableValues };

            // Clear active variables after submission — the initial variable
            // inputs have been consumed. If the AI agent needs new variables
            // mid-conversation, it will push them via setActiveVariables.
            setActiveVariables([]);
            setVariableValues({});

            return sendMessage({
                content: displayContent,
                variables: submittedVariables,
                resources,
            });
        },
        [sendMessage, variableValues, activeVariables, state.currentAgent, state.conversationId, setDbConversationId, sidebarEvents, searchParams]
    );

    const handleMessageContentChange = useCallback((messageId: string, newContent: string) => {
        updateMessage(messageId, { content: newContent });
    }, [updateMessage]);

    const currentAgentOption = DEFAULT_AGENTS.find((a) => a.promptId === state.currentAgent?.promptId) || DEFAULT_AGENTS[0];
    const hasVariables = activeVariables.length > 0;
    const isWelcomeScreen = messages.length === 0 && !isLoadingConversation;

    // Loading state for existing conversations (driven by layout)
    if (isLoadingConversation) {
        return (
            <div className={`h-full flex flex-col items-center justify-center ${className}`}>
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

        // Build the vars=classic/guided toggle URL
        const toggleUrl = (() => {
            const params = new URLSearchParams(searchParams.toString());
            if (useGuidedVars) {
                params.set('vars', 'classic');
            } else {
                params.delete('vars');
            }
            const qs = params.toString();
            return qs ? `?${qs}` : window.location.pathname;
        })();

        // Guided mode: pin input to bottom (like conversation mode)
        if (useGuidedVars && hasVariables) {
            return (
                <div className={`h-full flex flex-col ${className}`}>
                    {/* Top area — agent name + description, fills available space */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="flex flex-col items-center justify-end min-h-full px-3 md:px-8 pb-4">
                            <div className="w-full max-w-3xl text-center">
                                <h1 className={`font-semibold text-foreground ${
                                    varCount > 2 ? 'text-xl md:text-3xl' : 'text-2xl md:text-3xl'
                                }`}>
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

                    {/* Bottom-pinned: guided vars + input merged seamlessly */}
                    <div
                        className="flex-shrink-0 px-2 md:px-4 bg-transparent md:bg-background/95 md:backdrop-blur-sm"
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
                            <div className="rounded-b-2xl bg-background">
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
                                    onClick={() => router.replace(toggleUrl)}
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
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className={`min-h-full flex flex-col items-center px-3 md:px-8 ${
                        varCount > 2 ? 'justify-start pt-8 md:pt-16 md:justify-center' : 'justify-center'
                    }`}>
                        <div className="w-full max-w-3xl">
                            <div className={`text-center ${varCount > 2 ? 'mb-3 md:mb-6' : 'mb-6 md:mb-8'}`}>
                                <h1 className={`font-semibold text-foreground ${
                                    varCount > 2 ? 'text-xl md:text-3xl' : 'text-2xl md:text-3xl'
                                }`}>
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
                                    placeholder={
                                        hasVariables
                                            ? 'Additional instructions (optional)…'
                                            : 'What do you want to know?'
                                    }
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
                                        onClick={() => router.replace(toggleUrl)}
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
        <div className={`h-full flex flex-col ${className}`}>
            {/* Share bar — desktop only to avoid extra header row on mobile */}
            {isAuthenticated && shareConversationId && (
                <div className="flex-shrink-0 hidden md:flex items-center justify-end px-3 py-1">
                    <button
                        onClick={() => setIsShareOpen(true)}
                        className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors"
                        title="Share conversation"
                    >
                        <Share2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

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

            {/* Message area with fade overlays on mobile */}
            <div className="flex-1 min-h-0 relative">
                {/* Top fade gradient — mobile only */}
                <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none md:hidden" />

                <div className="h-full overflow-y-auto scrollbar-hide">
                    <div className="w-full max-w-[800px] mx-auto px-3 pt-2 pb-2 md:px-3 md:py-4 md:pb-4">
                        <MessageList
                            messages={messages}
                            streamEvents={streamEvents.length > 0 ? streamEvents : undefined}
                            isStreaming={isStreaming}
                            onMessageContentChange={handleMessageContentChange}
                            latestAssistantRef={latestAssistantRef}
                        />
                    </div>
                </div>

                {/* Bottom fade gradient — mobile only */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none md:hidden" />
            </div>

            {/* Input area — flush on mobile with gradient, padded on desktop */}
            <div
                className="flex-shrink-0 px-2 md:px-4 md:pt-2 bg-transparent md:bg-background/95 md:backdrop-blur-sm"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="w-full max-w-[800px] mx-auto">
                    {/* Variables above input — mid-conversation */}
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
                    <div className={`bg-background ${
                        hasVariables && useGuidedVars ? 'rounded-b-2xl' : 'rounded-2xl'
                    }`}>
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

export default ChatContainer;
