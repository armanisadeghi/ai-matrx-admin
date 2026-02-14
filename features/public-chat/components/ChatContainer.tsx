'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { useChatContext } from '../context/ChatContext';
import { useAgentsContext } from '../context/AgentsContext';
import { useAgentChat } from '../hooks/useAgentChat';
import { useChatPersistence } from '../hooks/useChatPersistence';
import { ChatInputWithControls } from './ChatInputWithControls';
import { MessageList } from './MessageDisplay';
import { PublicVariableInputs } from './PublicVariableInputs';
import { AgentActionButtons, DEFAULT_AGENTS } from './AgentSelector';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { formatText } from '@/utils/text/text-case-converter';
import type { PublicResource } from '../types/content';
import { MessageCircle, Share2 } from 'lucide-react';
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
    const { state, setAgent, addMessage, setUseLocalhost, updateMessage, setDbConversationId } = useChatContext();
    const { onAgentChange, isLoadingConversation, focusKey } = useLayoutAgent();
    const { sidebarEvents } = useAgentsContext();

    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const latestAssistantRef = useRef<HTMLDivElement>(null);
    const prevAssistantCountRef = useRef(0);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    // Ref for accessing dbConversationId in callbacks (avoids stale closure)
    const dbConvIdRef = useRef<string | null>(state.dbConversationId);

    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const useLocalhost = useSelector(selectIsUsingLocalhost);
    const { createConversation, saveMessages } = useChatPersistence();

    // Keep ref in sync with state
    useEffect(() => {
        dbConvIdRef.current = state.dbConversationId;
    }, [state.dbConversationId]);

    const { sendMessage, warmAgent, isStreaming, isExecuting, messages, conversationId } = useAgentChat({
        onStreamEvent: (event) => {
            // DEBUG: Log tool_update events reaching ChatContainer — remove after debugging
            if (event.event === 'tool_update') {
                console.log('[ChatContainer] tool_update received, adding to streamEvents');
            }
            setStreamEvents((prev) => [...prev, event]);
        },
        onComplete: () => {
            // DEBUG: Log streamEvents state at completion — remove after debugging
            console.log('[ChatContainer] onComplete — streamEvents will be cleared in 100ms');
            setTimeout(() => setStreamEvents([]), 100);
            // Persist to database (fire and forget)
            if (dbConvIdRef.current) {
                const currentMessages = state.messages;
                saveMessages(dbConvIdRef.current, currentMessages).catch(console.error);
                // Notify sidebar that this conversation was updated
                sidebarEvents.emit('conversation-updated', { id: dbConvIdRef.current });
            }
        },
        onError: (error) => {
            console.error('Chat error:', error);
        },
    });

    // Sync Redux server preference to chat context
    useEffect(() => {
        setUseLocalhost(useLocalhost);
    }, [useLocalhost, setUseLocalhost]);

    // Initialize variables from current agent on mount or agent change
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

        const varDefs = (agent || DEFAULT_AGENTS[0]).variableDefaults;
        if (varDefs && varDefs.length > 0) {
            const initialValues: Record<string, string> = {};
            varDefs.forEach(variable => {
                if (variable.defaultValue) {
                    initialValues[variable.name] = variable.defaultValue;
                }
            });
            setVariableValues(initialValues);
        } else {
            setVariableValues({});
        }
    }, [state.currentAgent?.promptId]);

    // Focus the first available input whenever the agent changes, on initial load,
    // or when a conversation finishes loading.
    // When the agent has variables → focus the first variable input.
    // When the agent has no variables → focus the main textarea.
    // Uses retries because agent change triggers router.push() which re-mounts components,
    // meaning the DOM elements may not exist yet when this effect first fires.
    useEffect(() => {
        // Don't attempt focus while a conversation is loading (loading spinner shown)
        if (isLoadingConversation) return;

        let cancelled = false;
        let attempts = 0;
        const maxAttempts = 8;

        function tryFocus() {
            if (cancelled) return;
            attempts++;

            const varDefs = state.currentAgent?.variableDefaults;
            if (varDefs && varDefs.length > 0) {
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

            // Create database conversation on first message
            if (!dbConvIdRef.current) {
                const title = (content?.trim().slice(0, 80) || state.currentAgent?.name || 'New Chat');
                const dbConvId = await createConversation({ title });
                if (dbConvId) {
                    dbConvIdRef.current = dbConvId;
                    setDbConversationId(dbConvId);
                    // Update URL to show conversation ID with agent context
                    const agentParam = state.currentAgent?.promptId
                        ? `?agent=${state.currentAgent.promptId}`
                        : '';
                    router.replace(`/p/chat/c/${dbConvId}${agentParam}`);
                    // Notify sidebar immediately
                    sidebarEvents.emit('conversation-created', { id: dbConvId, title });
                }
            }

            // Format message content with variables for display
            let displayContent = '';

            if (state.currentAgent?.variableDefaults && state.currentAgent.variableDefaults.length > 0) {
                const variableLines: string[] = [];
                state.currentAgent.variableDefaults.forEach(varDef => {
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

            return sendMessage({
                content: displayContent,
                variables: variableValues,
                resources,
            });
        },
        [sendMessage, variableValues, state.currentAgent, createConversation, setDbConversationId, router, sidebarEvents]
    );

    const handleMessageContentChange = useCallback((messageId: string, newContent: string) => {
        updateMessage(messageId, { content: newContent });
    }, [updateMessage]);

    const currentAgentOption = DEFAULT_AGENTS.find((a) => a.promptId === state.currentAgent?.promptId) || DEFAULT_AGENTS[0];
    const hasVariables = state.currentAgent?.variableDefaults && state.currentAgent.variableDefaults.length > 0;
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
        return (
            <div className={`h-full flex flex-col items-center justify-center px-3 md:px-8 ${className}`}>
                <div className="text-center mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-semibold mb-1.5 text-foreground">
                        {hasVariables ? state.currentAgent?.name || 'What can I help with?' : 'What can I help with?'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {hasVariables && state.currentAgent?.description
                            ? state.currentAgent.description
                            : 'AI with Matrx superpowers'}
                    </p>
                </div>

                <div className="w-full max-w-3xl">
                    {hasVariables && (
                        <div className="mb-6">
                            <PublicVariableInputs
                                variableDefaults={state.currentAgent!.variableDefaults!}
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

                    <div className="rounded-2xl border border-border">
                        <ChatInputWithControls
                            onSubmit={handleSubmit}
                            disabled={isExecuting}
                            placeholder={
                                hasVariables
                                    ? 'Enter your message (or just press Enter to use variables only)'
                                    : 'What do you want to know?'
                            }
                            conversationId={conversationId}
                            onAgentSelect={handleAgentSelect}
                            hasVariables={hasVariables}
                            selectedAgent={state.currentAgent}
                            textInputRef={textInputRef}
                        />
                    </div>

                    <div className="mt-6">
                        <AgentActionButtons
                            agents={DEFAULT_AGENTS}
                            selectedAgent={currentAgentOption}
                            onSelect={handleAgentSelect}
                            disabled={isExecuting}
                        />
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
            {isAuthenticated && shareConversationId && (
                <div className="flex-shrink-0 flex items-center justify-end px-3 py-1">
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

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                <div className="w-full max-w-[800px] mx-auto px-4 md:px-3 py-4 pb-4">
                    <MessageList
                        messages={messages}
                        streamEvents={streamEvents.length > 0 ? streamEvents : undefined}
                        isStreaming={isStreaming}
                        onMessageContentChange={handleMessageContentChange}
                        latestAssistantRef={latestAssistantRef}
                    />
                </div>
            </div>

            <div
                className="flex-shrink-0 pt-2 px-2 md:px-4 bg-background/95 backdrop-blur-sm"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="w-full max-w-[800px] mx-auto">
                    <div className="rounded-2xl border border-border bg-background">
                        <ChatInputWithControls
                            onSubmit={handleSubmit}
                            disabled={isExecuting}
                            conversationId={conversationId}
                            onAgentSelect={handleAgentSelect}
                            hasVariables={hasVariables}
                            selectedAgent={state.currentAgent}
                            textInputRef={textInputRef}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChatContainer;
