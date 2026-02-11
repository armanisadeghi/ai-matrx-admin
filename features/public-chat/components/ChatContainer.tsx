'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { useChatContext } from '../context/ChatContext';
import { useAgentChat } from '../hooks/useAgentChat';
import { useChatPersistence } from '../hooks/useChatPersistence';
import { ChatInputWithControls } from './ChatInputWithControls';
import { MessageList } from './MessageDisplay';
import { PublicVariableInputs } from './PublicVariableInputs';
import { AgentActionButtons, DEFAULT_AGENTS } from './AgentSelector';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { formatText } from '@/utils/text/text-case-converter';
import type { PublicResource } from '../types/content';
import { processDbMessagesForDisplay } from '../utils/cx-content-converter';
import { MessageCircle, Share2 } from 'lucide-react';
import { ShareModal } from '@/features/sharing';

// ============================================================================
// TYPES
// ============================================================================

interface ChatContainerProps {
    className?: string;
    /** If provided, load an existing conversation from the database */
    existingRequestId?: string;
}

// ============================================================================
// CHAT CONTAINER
// ============================================================================

export function ChatContainer({ className = '', existingRequestId }: ChatContainerProps) {
    const { state, setAgent, addMessage, setUseLocalhost, updateMessage } = useChatContext();
    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const latestAssistantRef = useRef<HTMLDivElement>(null);
    const prevAssistantCountRef = useRef(0);
    const dbConversationIdRef = useRef<string | null>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);

    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;

    // Read server preference from Redux (set via AdminMenu in header)
    const useLocalhost = useSelector(selectIsUsingLocalhost);

    // Database persistence
    const { createConversation, saveMessages, loadConversation } = useChatPersistence();

    const { sendMessage, warmAgent, isStreaming, isExecuting, messages, conversationId } = useAgentChat({
        onStreamEvent: (event) => {
            setStreamEvents((prev) => [...prev, event]);
        },
        onComplete: () => {
            // Reset stream events after completion (content is now in message)
            setTimeout(() => setStreamEvents([]), 100);

            // Persist to database (fire and forget)
            if (dbConversationIdRef.current) {
                const currentMessages = state.messages;
                saveMessages(dbConversationIdRef.current, currentMessages).catch(console.error);
            }
        },
        onError: (error) => {
            console.error('Chat error:', error);
        },
    });

    // Load existing conversation if conversationId is provided
    useEffect(() => {
        if (!existingRequestId) return;

        let cancelled = false;
        setIsLoadingConversation(true);

        (async () => {
            const data = await loadConversation(existingRequestId);
            if (cancelled || !data) {
                setIsLoadingConversation(false);
                return;
            }

            dbConversationIdRef.current = existingRequestId;

            // Convert cx_message content blocks to display-ready format.
            // Handles: text, thinking, media, tool_call, tool_result blocks.
            // Merges tool-role messages into the preceding assistant message.
            const processedMessages = processDbMessagesForDisplay(data.messages);

            for (const msg of processedMessages) {
                addMessage({
                    role: msg.role,
                    content: msg.content,
                    status: 'complete',
                    toolUpdates: msg.toolUpdates.length > 0 ? msg.toolUpdates : undefined,
                    isCondensed: msg.isCondensed || undefined,
                });
            }

            setIsLoadingConversation(false);
        })();

        return () => { cancelled = true; };
    }, [existingRequestId]);

    // Sync Redux server preference to chat context
    // AdminMenu in header controls this via Redux
    useEffect(() => {
        setUseLocalhost(useLocalhost);
    }, [useLocalhost, setUseLocalhost]);

    // Set default agent on mount
    useEffect(() => {
        if (!state.currentAgent) {
            const defaultAgent = DEFAULT_AGENTS[0];
            setAgent({
                promptId: defaultAgent.promptId,
                name: defaultAgent.name,
                description: defaultAgent.description,
                variableDefaults: defaultAgent.variableDefaults,
            });
            
            // Initialize variables with default values
            const initialValues: Record<string, string> = {};
            if (defaultAgent.variableDefaults) {
                defaultAgent.variableDefaults.forEach(variable => {
                    if (variable.defaultValue) {
                        initialValues[variable.name] = variable.defaultValue;
                    }
                });
            }
            setVariableValues(initialValues);
        }
    }, [state.currentAgent, setAgent]);

    // Pre-warm agent
    useEffect(() => {
        if (state.currentAgent?.promptId) {
            warmAgent(state.currentAgent.promptId);
        }
    }, [state.currentAgent?.promptId, warmAgent]);

    // One-time scroll when a NEW assistant message appears
    // Positions the assistant message at the top of the viewport
    useEffect(() => {
        const assistantCount = messages.filter(m => m.role === 'assistant').length;
        
        // Only scroll when a NEW assistant message is added (count increased)
        if (assistantCount > prevAssistantCountRef.current && latestAssistantRef.current) {
            latestAssistantRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
        
        prevAssistantCountRef.current = assistantCount;
    }, [messages]);

    const handleAgentSelect = useCallback(
        (agent: typeof DEFAULT_AGENTS[0]) => {
            setAgent({
                promptId: agent.promptId,
                name: agent.name,
                description: agent.description,
                variableDefaults: agent.variableDefaults,
            });
            
            // Initialize variables with default values
            const initialValues: Record<string, string> = {};
            if (agent.variableDefaults) {
                agent.variableDefaults.forEach(variable => {
                    if (variable.defaultValue) {
                        initialValues[variable.name] = variable.defaultValue;
                    }
                });
            }
            setVariableValues(initialValues);
            setStreamEvents([]);
        },
        [setAgent]
    );

    const handleVariableChange = useCallback((name: string, value: string) => {
        setVariableValues((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(
        async (content: string, resources?: PublicResource[]) => {
            setStreamEvents([]);

            // Create database conversation on first message
            if (!dbConversationIdRef.current && !existingRequestId) {
                const title = (content?.trim().slice(0, 80) || state.currentAgent?.name || 'New Chat');
                const conversationId = await createConversation({ title });
                if (conversationId) {
                    dbConversationIdRef.current = conversationId;
                }
            }
            
            // Format message content with variables for display
            let displayContent = '';
            
            // Add variables if they exist (show all variables, including defaults)
            if (state.currentAgent?.variableDefaults && state.currentAgent.variableDefaults.length > 0) {
                const variableLines: string[] = [];
                state.currentAgent.variableDefaults.forEach(varDef => {
                    // Use the value from variableValues, or fall back to defaultValue
                    const value = variableValues[varDef.name] || varDef.defaultValue || '';
                    if (value) {
                        const formattedName = formatText(varDef.name);
                        variableLines.push(`${formattedName}: ${value}`);
                    }
                });
                
                if (variableLines.length > 0) {
                    displayContent = variableLines.join('\n');
                    
                    // Add user input below variables if it exists
                    if (content.trim()) {
                        displayContent += '\n\n' + content;
                    }
                } else {
                    // No variables with values, just use content
                    displayContent = content;
                }
            } else {
                // No variables, just use content
                displayContent = content;
            }
            
            return sendMessage({
                content: displayContent,
                variables: variableValues,
                resources,
            });
        },
        [sendMessage, variableValues, state.currentAgent]
    );

    const handleMessageContentChange = useCallback((messageId: string, newContent: string) => {
        updateMessage(messageId, { content: newContent });
    }, [updateMessage]);

    const currentAgentOption = DEFAULT_AGENTS.find((a) => a.promptId === state.currentAgent?.promptId) || DEFAULT_AGENTS[0];
    const hasVariables = state.currentAgent?.variableDefaults && state.currentAgent.variableDefaults.length > 0;
    const isWelcomeScreen = messages.length === 0 && !isLoadingConversation;

    // Loading state for existing conversations
    if (isLoadingConversation) {
        return (
            <div className={`h-full flex flex-col items-center justify-center ${className}`}>
                <MessageCircle className="h-8 w-8 text-primary animate-pulse mb-3" />
                <p className="text-sm text-muted-foreground">Loading conversation...</p>
            </div>
        );
    }

    // ========================================================================
    // WELCOME SCREEN — centered input, no bottom bar
    // ========================================================================
    if (isWelcomeScreen) {
        return (
            <div className={`h-full flex flex-col items-center justify-center px-3 md:px-8 ${className}`}>
                {/* Welcome Header */}
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

                {/* Main Input Area */}
                <div className="w-full max-w-3xl">
                    {/* Variables (if agent has them) */}
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

                    {/* Chat Input */}
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

                    {/* Agent Action Buttons */}
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
    // CONVERSATION MODE — messages + bottom-pinned input
    // Layout: flex column with messages (flex-1 scrollable) + input (flex-shrink-0)
    // This guarantees the input is ALWAYS visible at the bottom of the container,
    // regardless of viewport height, keyboard state, or message count.
    // ========================================================================
    // Determine the conversation ID for the share modal
    const shareConversationId = dbConversationIdRef.current || existingRequestId;
    const conversationTitle = state.messages[0]?.content?.slice(0, 60) || 'Chat';

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Conversation header bar — share action */}
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

            {/* Share modal */}
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

            {/* Messages — scrollable, takes all remaining space */}
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

            {/* Input — pinned to bottom, never hidden */}
            {/* Uses flex-shrink-0 so it can NEVER be pushed off screen */}
            {/* Bottom padding: max(12px, safe-area) ensures padding on ALL devices */}
            <div
                className="flex-shrink-0 pt-2 px-2 md:px-4 bg-background/95 backdrop-blur-sm"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="w-full max-w-[800px] mx-auto">
                    {/* Input */}
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
