'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { useChatContext } from '../context/ChatContext';
import { useAgentChat } from '../hooks/useAgentChat';
import { ChatInputWithControls } from './ChatInputWithControls';
import { MessageList } from './MessageDisplay';
import { PublicVariableInputs } from './PublicVariableInputs';
import { AgentActionButtons, DEFAULT_AGENTS } from './AgentSelector';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { formatText } from '@/utils/text/text-case-converter';
import type { PublicResource } from '../types/content';

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
    const { state, setAgent, startNewConversation, setUseLocalhost } = useChatContext();
    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Read server preference from Redux (set via AdminMenu in header)
    const useLocalhost = useSelector(selectIsUsingLocalhost);

    const { sendMessage, warmAgent, isStreaming, isExecuting, messages, conversationId } = useAgentChat({
        onStreamEvent: (event) => {
            setStreamEvents((prev) => [...prev, event]);
        },
        onComplete: () => {
            // Reset stream events after completion (content is now in message)
            setTimeout(() => setStreamEvents([]), 100);
        },
        onError: (error) => {
            console.error('Chat error:', error);
        },
    });

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

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamEvents]);

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
            console.log('📤 Submitting with variables:', variableValues);
            
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

    const handleNewChat = useCallback(() => {
        startNewConversation();
        setStreamEvents([]);
        setVariableValues({});
    }, [startNewConversation]);

    const currentAgentOption = DEFAULT_AGENTS.find((a) => a.promptId === state.currentAgent?.promptId) || DEFAULT_AGENTS[0];
    const hasVariables = state.currentAgent?.variableDefaults && state.currentAgent.variableDefaults.length > 0;
    const isWelcomeScreen = messages.length === 0;

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {isWelcomeScreen ? (
                    <div className="h-full flex flex-col items-center justify-center px-4 md:px-8">
                        {/* Welcome Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">
                                {hasVariables ? state.currentAgent?.name || 'Chat reimagined.' : 'Chat reimagined.'}
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-400">
                                {hasVariables && state.currentAgent?.description
                                    ? state.currentAgent.description
                                    : 'Artificial Intelligence with Matrx Superpowers.'}
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
                                    />
                                </div>
                            )}

                            {/* Chat Input */}
                            <div className="rounded-3xl border border-border">
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
                ) : (
                    <div className="w-full max-w-[800px] mx-auto px-4 md:px-3 py-6 pb-40">
                        <MessageList
                            messages={messages}
                            streamEvents={streamEvents.length > 0 ? streamEvents : undefined}
                            isStreaming={isStreaming}
                        />
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Fixed Input (when not on welcome screen) */}
            {!isWelcomeScreen && (
                <div className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full bg-textured pb-safe pt-2 z-10">
                    <div className="w-full max-w-[800px] mx-auto px-1">
                        {/* New Chat Button */}
                        <div className="flex justify-end mb-2 pr-2">
                            <button
                                onClick={handleNewChat}
                                disabled={isExecuting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={12} />
                                New Chat
                            </button>
                        </div>

                        {/* Variables (collapsed by default in conversation mode) */}
                        {hasVariables && showSettings && (
                            <div className="mb-3">
                                <PublicVariableInputs
                                    variableDefaults={state.currentAgent!.variableDefaults!}
                                    values={variableValues}
                                    onChange={handleVariableChange}
                                    disabled={isExecuting}
                                    compact
                                />
                            </div>
                        )}

                        {/* Input */}
                        <div className="rounded-3xl border border-border">
                            <ChatInputWithControls
                                onSubmit={handleSubmit}
                                disabled={isExecuting}
                                conversationId={conversationId}
                                onAgentSelect={handleAgentSelect}
                                hasVariables={hasVariables}
                                selectedAgent={state.currentAgent}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatContainer;
