'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Bot, RefreshCw, Settings2, Server } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import { useAgentChat } from '../hooks/useAgentChat';
import { ChatInputWithControls } from './ChatInputWithControls';
import { MessageList } from './MessageDisplay';
import { VariableInputs, type VariableSchema } from './VariableInputs';
import { AgentSelector, AgentActionButtons, DEFAULT_AGENTS } from './AgentSelector';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
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
    const { state, setAgent, setAuth, startNewConversation, setUseLocalhost } = useChatContext();
    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Check for authentication and admin status on mount
    useEffect(() => {
        async function checkAuth() {
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                
                let isAdmin = false;
                if (session?.user?.id) {
                    // Check if user is an admin
                    const { data: adminData } = await supabase
                        .from('admins')
                        .select('user_id')
                        .eq('user_id', session.user.id)
                        .maybeSingle();
                    
                    isAdmin = !!adminData;
                }
                
                setAuth(session?.access_token || null, !!session, isAdmin);
            } catch (err) {
                setAuth(null, false, false);
            }
        }
        checkAuth();
    }, [setAuth]);

    // Set default agent on mount
    useEffect(() => {
        if (!state.currentAgent) {
            const defaultAgent = DEFAULT_AGENTS[0];
            setAgent({
                promptId: defaultAgent.promptId,
                name: defaultAgent.name,
                description: defaultAgent.description,
                variables: defaultAgent.variables,
            });
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
                variables: agent.variables,
            });
            setVariableValues({});
            setStreamEvents([]);
        },
        [setAgent]
    );

    const handleVariableChange = useCallback((name: string, value: any) => {
        setVariableValues((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = useCallback(
        async (content: string, resources?: PublicResource[]) => {
            setStreamEvents([]);
            return sendMessage({
                content,
                variables: variableValues,
                resources,
            });
        },
        [sendMessage, variableValues]
    );

    const handleNewChat = useCallback(() => {
        startNewConversation();
        setStreamEvents([]);
        setVariableValues({});
    }, [startNewConversation]);

    const handleToggleLocalhost = useCallback(() => {
        setUseLocalhost(!state.useLocalhost);
    }, [setUseLocalhost, state.useLocalhost]);

    const currentAgentOption = DEFAULT_AGENTS.find((a) => a.promptId === state.currentAgent?.promptId) || DEFAULT_AGENTS[0];
    const hasVariables = state.currentAgent?.variables && state.currentAgent.variables.length > 0;
    const isWelcomeScreen = messages.length === 0;

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Admin localhost toggle */}
            {state.isAdmin && (
                <div className="flex-shrink-0 px-4 pt-2">
                    <button
                        onClick={handleToggleLocalhost}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-colors"
                        title={state.useLocalhost ? 'Using localhost:8000' : 'Using production server'}
                    >
                        <Server className="h-3.5 w-3.5" />
                        <span className="font-medium">
                            {state.useLocalhost ? '🏠 localhost:8000' : '🌐 Production'}
                        </span>
                    </button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {isWelcomeScreen ? (
                    <div className="h-full flex flex-col items-center justify-center px-4 md:px-8">
                        {/* Welcome Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">
                                Chat reimagined.
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-400">
                                Artificial Intelligence with Matrx Superpowers.
                            </p>
                        </div>

                        {/* Main Input Area */}
                        <div className="w-full max-w-3xl">
                            {/* Agent Selector */}
                            <div className="flex justify-center mb-4">
                                <AgentSelector
                                    agents={DEFAULT_AGENTS}
                                    selectedAgent={currentAgentOption}
                                    onSelect={handleAgentSelect}
                                    disabled={isExecuting}
                                />
                            </div>

                            {/* Variables (if agent has them) */}
                            {hasVariables && (
                                <div className="mb-4">
                                    <VariableInputs
                                        variables={state.currentAgent!.variables as VariableSchema[]}
                                        values={variableValues}
                                        onChange={handleVariableChange}
                                        disabled={isExecuting}
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
                                <VariableInputs
                                    variables={state.currentAgent!.variables as VariableSchema[]}
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
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatContainer;
