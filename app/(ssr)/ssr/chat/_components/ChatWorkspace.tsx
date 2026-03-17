'use client';

// app/(ssr)/ssr/chat/_components/ChatWorkspace.tsx
// Main client island for the SSR chat route.
//
// Architecture:
//   - Welcome screen: renders the landing UI with agent picker, variables, and custom chat config
//   - Conversation mode: delegates to UnifiedChatWrapper from the unified conversation system
//   - URL state: pathname for conversationId, searchParams for agent/vars/localhost
//   - Custom DOM events for sidebar sync
//   - SsrAgentContext for shared agent state across header, sidebar, and workspace

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { MessageCircle, List, Layers } from 'lucide-react';

// Chat infrastructure (ChatContext still used for welcome screen state + sidebar sync)
import { useChatContext } from '@/features/public-chat/context/ChatContext';
import type { AgentConfig } from '@/features/public-chat/context/ChatContext';
import { useChatPersistence } from '@/features/public-chat/hooks/useChatPersistence';
import { buildCanonicalMessages, canonicalArrayToLegacy } from '@/lib/chat-protocol';

// Unified conversation system
import { useConversationSession } from '@/components/conversation/hooks/useConversationSession';
import { ConversationShell } from '@/components/conversation/ConversationShell';
import { chatConversationsActions } from '@/lib/redux/chatConversations/slice';
import { selectConversationId as selectUnifiedConversationId } from '@/lib/redux/chatConversations/selectors';
import type { ChatModeConfig, ApiMode } from '@/lib/redux/chatConversations/types';

// Shared agent state
import { useSsrAgent } from './SsrAgentContext';

// Header controls
import ChatHeaderControls from './ChatHeaderControls';

// Eager imports — always rendered on welcome screen
import { ChatInputWithControls } from '@/features/public-chat/components/ChatInputWithControls';
import { ResponseModeButtons, BackToStartButton, DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';

// Lazy imports — conditionally rendered
const ShareModal = dynamic(() => import('@/features/sharing').then(m => ({ default: m.ShareModal })), { ssr: false });
const PublicVariableInputs = dynamic(() => import('@/features/public-chat/components/PublicVariableInputs').then(m => ({ default: m.PublicVariableInputs })), { ssr: false });
const GuidedVariableInputs = dynamic(() => import('@/features/public-chat/components/GuidedVariableInputs').then(m => ({ default: m.GuidedVariableInputs })), { ssr: false });
const CustomChatConfig = dynamic(() => import('./CustomChatConfig'), { ssr: false });
const ModelOverrideSelector = dynamic(() => import('./ModelOverrideSelector'), { ssr: false });

import type { PublicResource } from '@/features/public-chat/types/content';
import type { PromptVariable } from '@/features/prompts/types/core';
import { formatText } from '@/utils/text/text-case-converter';

// ============================================================================
// CONVERSATION VIEW — Renders UnifiedChatWrapper when messages exist
// ============================================================================

interface ConversationViewProps {
    agentId: string;
    apiMode: ApiMode;
    conversationId?: string;
    chatModeConfig?: ChatModeConfig;
    variableDefaults?: PromptVariable[];
    variables?: Record<string, string>;
    modelOverride?: string;
    authenticated: boolean;
    onConversationIdChange: (id: string) => void;
}

function ConversationView({
    agentId,
    apiMode,
    conversationId,
    chatModeConfig,
    variableDefaults,
    variables,
    modelOverride,
    authenticated,
    onConversationIdChange,
}: ConversationViewProps) {
    const session = useConversationSession({
        agentId,
        apiMode,
        conversationId,
        loadHistory: !!conversationId,
        chatModeConfig,
        variableDefaults,
        variables,
        modelOverride,
    });

    // Notify parent when conversation ID changes (for URL sync)
    useEffect(() => {
        if (session.conversationId) {
            onConversationIdChange(session.conversationId);
        }
    }, [session.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <ConversationShell
            sessionId={session.sessionId}
            compact={false}
            inputProps={{
                showVoice: authenticated,
                showResourcePicker: authenticated,
                showModelPicker: false,
                showVariables: false,
                seamless: false,
            }}
        />
    );
}

// ============================================================================
// INNER WORKSPACE — wrapped by ChatProvider
// ============================================================================

function ChatWorkspaceInner() {
    const dispatch = useAppDispatch();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { state, setUseLocalhost, loadConversation: loadConversationAction, startNewConversation } = useChatContext();

    // Shared agent state
    const { selectedAgent, onAgentChange, openAgentPicker } = useSsrAgent();

    // Variables
    const useGuidedVars = searchParams.get('vars') !== 'classic';
    const [variableValues, setVariableValues] = useState<Record<string, any>>({});
    const [activeVariables, setActiveVariables] = useState<PromptVariable[]>([]);

    // Mode state
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [focusKey, setFocusKey] = useState(0);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const variableInputRef = useRef<HTMLInputElement>(null);

    // Custom chat mode state
    const [customChatConfig, setCustomChatConfig] = useState<ChatModeConfig | null>(null);
    const [isCustomChatActive, setIsCustomChatActive] = useState(false);

    // Model override state (for agent mode)
    const [modelOverride, setModelOverride] = useState<string | null>(null);

    // Track whether we've entered conversation mode (first message sent or conversation loaded)
    const [isInConversation, setIsInConversation] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Redux state
    const user = useAppSelector(selectUser);
    const isAuthenticated = !!user?.id;
    const useLocalhost = useAppSelector(selectIsUsingLocalhost);

    // Persistence hook
    const persistence = useChatPersistence();

    // ========================================================================
    // URL STATE
    // ========================================================================

    const conversationIdFromUrl = useMemo(() => {
        const match = pathname.match(/\/ssr\/chat\/([^/?]+)/);
        return match?.[1] ?? null;
    }, [pathname]);

    const agentIdFromUrl = searchParams.get('agent');
    const localhostFromUrl = searchParams.get('localhost') === '1';

    // ========================================================================
    // SYNC EFFECTS
    // ========================================================================

    // Sync localhost preference
    useEffect(() => {
        setUseLocalhost(useLocalhost || localhostFromUrl);
    }, [useLocalhost, localhostFromUrl, setUseLocalhost]);

    // Focus on agent URL change
    useEffect(() => {
        if (agentIdFromUrl) {
            setFocusKey(k => k + 1);
        }
    }, [agentIdFromUrl]);

    // Handle URL conversation loading
    useEffect(() => {
        if (!conversationIdFromUrl) {
            // No conversation in URL — reset to welcome screen
            if (isInConversation || state.dbConversationId) {
                setIsInConversation(false);
                setActiveConversationId(null);
                setCustomChatConfig(null);
                setIsCustomChatActive(false);
                startNewConversation();
            }
            return;
        }

        // Already loaded?
        if (activeConversationId === conversationIdFromUrl) return;

        // Load the conversation from the database and switch to conversation view
        setIsInConversation(true);
        setActiveConversationId(conversationIdFromUrl);
        setIsCustomChatActive(false);
        setCustomChatConfig(null);
    }, [conversationIdFromUrl]);

    // ========================================================================
    // CONVERSATION ID SYNC — Update URL when unified system creates a conversation
    // ========================================================================

    const handleConversationIdChange = useCallback((newConversationId: string) => {
        if (!newConversationId) return;
        if (conversationIdFromUrl === newConversationId) return;

        // Update URL
        const url = `/ssr/chat/${newConversationId}`;
        window.history.pushState(null, '', url);

        // Notify sidebar
        window.dispatchEvent(new CustomEvent('chat:conversationCreated', {
            detail: { id: newConversationId, title: 'New Chat' },
        }));

        setActiveConversationId(newConversationId);
    }, [conversationIdFromUrl]);

    // ========================================================================
    // VARIABLE MANAGEMENT
    // ========================================================================

    const hasMessages = isInConversation;

    useEffect(() => {
        if (hasMessages) {
            setActiveVariables([]);
            setVariableValues({});
            return;
        }

        const varDefs = selectedAgent.variableDefaults;
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
    }, [selectedAgent.promptId, hasMessages]);

    // Focus management
    useEffect(() => {
        if (isLoadingConversation || isInConversation) return;

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
    }, [selectedAgent.promptId, focusKey, isLoadingConversation, activeVariables.length, isInConversation]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleAgentSelect = useCallback((agent: AgentConfig) => {
        onAgentChange(agent);
        setIsInConversation(false);
        setActiveConversationId(null);
        setCustomChatConfig(null);
        setIsCustomChatActive(false);
        setModelOverride(null);
        setFocusKey(k => k + 1);
    }, [onAgentChange]);

    const handleModeSelect = useCallback((_modeId: string, agentId: string | null) => {
        if (!agentId) return;
        const match = DEFAULT_AGENTS.find(a => a.promptId === agentId);
        handleAgentSelect(match || { ...DEFAULT_AGENTS[0], promptId: agentId, id: agentId });
    }, [handleAgentSelect]);

    const handleBackToStart = useCallback(() => {
        handleAgentSelect(DEFAULT_AGENTS[0]);
    }, [handleAgentSelect]);

    const handleVariableChange = useCallback((name: string, value: string) => {
        setVariableValues(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleNewChat = useCallback(() => {
        setIsInConversation(false);
        setActiveConversationId(null);
        setCustomChatConfig(null);
        setIsCustomChatActive(false);
        setModelOverride(null);
        const url = '/ssr/chat';
        window.history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);

    // Handle first message submit from welcome screen → transition to conversation
    const handleFirstSubmit = useCallback(async (content: string, resources?: PublicResource[]) => {
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

        // Clear variables (they're only shown on welcome screen)
        setActiveVariables([]);
        setVariableValues({});

        // Now transition to conversation mode — the ConversationView will handle sending
        setIsInConversation(true);

        // We need to queue the first message to be sent after the session initializes.
        // Store it for the ConversationView to pick up.
        firstMessageRef.current = {
            content: displayContent,
            variables: { ...variableValues },
        };
    }, [activeVariables, variableValues]);

    // Ref to pass first message to ConversationView
    const firstMessageRef = useRef<{ content: string; variables: Record<string, unknown> } | null>(null);

    // Handle custom chat activation
    const handleCustomChatActivate = useCallback((config: ChatModeConfig) => {
        setCustomChatConfig(config);
        setIsCustomChatActive(true);
        // Don't enter conversation mode yet — user still needs to type a message
    }, []);

    const handleCustomChatSubmit = useCallback(async (content: string) => {
        setIsInConversation(true);
        firstMessageRef.current = { content, variables: {} };
    }, []);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================

    const hasVariables = activeVariables.length > 0;
    const isWelcomeScreen = !isInConversation && !isLoadingConversation;

    const headerLabel = !isWelcomeScreen
        ? (selectedAgent.name || 'Chat')
        : (selectedAgent.name || 'Chat');

    const agentName = selectedAgent.name || 'Chat';
    const currentApiMode: ApiMode = isCustomChatActive ? 'chat' : 'agent';
    const currentAgentId = isCustomChatActive ? 'custom-chat' : selectedAgent.promptId;

    // ========================================================================
    // LOADING STATE
    // ========================================================================

    if (isLoadingConversation) {
        return (
            <>
                <ChatHeaderControls
                    agentName={agentName}
                    headerLabel={headerLabel}
                    isConversation={true}
                    isAuthenticated={isAuthenticated}
                    dbConversationId={null}
                    selectedAgent={selectedAgent}
                    onAgentSelect={handleAgentSelect}
                    onNewChat={handleNewChat}
                    onShare={() => setIsShareOpen(true)}
                />
                <div className="h-full flex flex-col items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-primary animate-pulse mb-3" />
                    <p className="text-sm text-muted-foreground">Loading conversation...</p>
                </div>
            </>
        );
    }

    // ========================================================================
    // CONVERSATION MODE — Unified system handles everything
    // ========================================================================

    if (isInConversation) {
        const shareConversationId = activeConversationId;

        return (
            <>
                <ChatHeaderControls
                    agentName={isCustomChatActive ? 'Direct Chat' : agentName}
                    headerLabel={isCustomChatActive ? 'Direct Chat' : headerLabel}
                    isConversation={true}
                    isAuthenticated={isAuthenticated}
                    dbConversationId={activeConversationId}
                    selectedAgent={selectedAgent}
                    onAgentSelect={handleAgentSelect}
                    onNewChat={handleNewChat}
                    onShare={() => setIsShareOpen(true)}
                    modelOverride={modelOverride}
                    onModelOverrideChange={setModelOverride}
                    showModelOverride={!isCustomChatActive}
                />
                <div className="h-full flex flex-col">
                    {/* Share Modal */}
                    {isShareOpen && shareConversationId && (
                        <ShareModal
                            isOpen={isShareOpen}
                            onClose={() => setIsShareOpen(false)}
                            resourceType="cx_conversation"
                            resourceId={shareConversationId}
                            resourceName="Chat"
                            isOwner={true}
                        />
                    )}

                    {/* Unified Conversation */}
                    <ConversationViewWithFirstMessage
                        agentId={currentAgentId}
                        apiMode={currentApiMode}
                        conversationId={activeConversationId ?? undefined}
                        chatModeConfig={customChatConfig ?? undefined}
                        variableDefaults={selectedAgent.variableDefaults}
                        modelOverride={modelOverride ?? undefined}
                        authenticated={isAuthenticated}
                        onConversationIdChange={handleConversationIdChange}
                        firstMessage={firstMessageRef.current}
                        onFirstMessageSent={() => { firstMessageRef.current = null; }}
                    />
                </div>
            </>
        );
    }

    // ========================================================================
    // WELCOME SCREEN
    // ========================================================================

    const varCount = activeVariables.length;
    const agentDescription = hasVariables ? selectedAgent.description : null;
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

    // Custom chat mode: show direct chat config + input
    if (isCustomChatActive) {
        return (
            <>
                <ChatHeaderControls
                    agentName="Direct Chat"
                    headerLabel="Direct Chat"
                    isConversation={false}
                    isAuthenticated={isAuthenticated}
                    dbConversationId={null}
                    selectedAgent={selectedAgent}
                    onAgentSelect={handleAgentSelect}
                    onNewChat={handleNewChat}
                    onShare={() => {}}
                />
                <div className="h-full flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="min-h-full flex flex-col items-center justify-center px-3 md:px-8">
                            <div className="w-full max-w-3xl">
                                <div className="text-center mb-6 md:mb-8">
                                    <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Direct Chat</h1>
                                    <p className="mt-1 text-sm text-muted-foreground/70">
                                        Custom model & configuration
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <CustomChatConfig
                                        onActivate={handleCustomChatActivate}
                                        isActive={true}
                                    />
                                </div>

                                <ChatInputWithControls
                                    onSubmit={handleCustomChatSubmit}
                                    disabled={false}
                                    placeholder="Send a message..."
                                    conversationId={null}
                                    hasVariables={false}
                                    selectedAgent={selectedAgent}
                                    textInputRef={textInputRef}
                                />

                                <div className="flex items-center justify-between mt-3 md:mt-6 pb-4">
                                    <BackToStartButton onBack={handleBackToStart} agentName="Direct Chat" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Guided mode: pin input to bottom
    if (useGuidedVars && hasVariables) {
        return (
            <>
                <ChatHeaderControls
                    agentName={agentName}
                    headerLabel={headerLabel}
                    isConversation={false}
                    isAuthenticated={isAuthenticated}
                    dbConversationId={null}
                    selectedAgent={selectedAgent}
                    onAgentSelect={handleAgentSelect}
                    onNewChat={handleNewChat}
                    onShare={() => setIsShareOpen(true)}
                    modelOverride={modelOverride}
                    onModelOverrideChange={setModelOverride}
                    showModelOverride
                />
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
                                disabled={false}
                                textInputRef={textInputRef}
                                submitOnEnter={true}
                                onSubmit={handleFirstSubmit}
                                seamless
                            />
                            <div className="rounded-b-2xl bg-card/80 backdrop-blur-sm">
                                <ChatInputWithControls
                                    onSubmit={handleFirstSubmit}
                                    disabled={false}
                                    placeholder="Additional instructions (optional)…"
                                    conversationId={null}
                                    hasVariables={hasVariables}
                                    selectedAgent={selectedAgent}
                                    textInputRef={textInputRef}
                                    seamless
                                />
                            </div>
                            <div className="flex items-center justify-between mt-3 pb-2">
                                <BackToStartButton onBack={handleBackToStart} agentName={agentName || undefined} />
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
            </>
        );
    }

    // Classic mode (or no variables): centered layout
    return (
        <>
            <ChatHeaderControls
                agentName={agentName}
                headerLabel={headerLabel}
                isConversation={false}
                isAuthenticated={isAuthenticated}
                dbConversationId={null}
                selectedAgent={selectedAgent}
                onAgentSelect={handleAgentSelect}
                onNewChat={handleNewChat}
                onShare={() => setIsShareOpen(true)}
                modelOverride={modelOverride}
                onModelOverrideChange={setModelOverride}
                showModelOverride
            />
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
                                        disabled={false}
                                        minimal
                                        textInputRef={textInputRef}
                                        submitOnEnter={true}
                                        onSubmit={handleFirstSubmit}
                                    />
                                </div>
                            )}

                            <div>
                                <ChatInputWithControls
                                    onSubmit={handleFirstSubmit}
                                    disabled={false}
                                    placeholder={hasVariables ? 'Additional instructions (optional)…' : 'What do you want to know?'}
                                    conversationId={null}
                                    hasVariables={hasVariables}
                                    selectedAgent={selectedAgent}
                                    textInputRef={textInputRef}
                                />
                            </div>

                            {/* Custom Chat Config — below input, only when no variables */}
                            {!hasVariables && (
                                <div className="mt-4">
                                    <CustomChatConfig
                                        onActivate={handleCustomChatActivate}
                                        isActive={false}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-3 md:mt-6 pb-4">
                                {hasVariables ? (
                                    <BackToStartButton onBack={handleBackToStart} agentName={agentName || undefined} />
                                ) : (
                                    <ResponseModeButtons
                                        disabled={false}
                                        selectedAgentId={selectedAgent.promptId}
                                        onModeSelect={handleModeSelect}
                                    />
                                )}
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
        </>
    );
}

// ============================================================================
// CONVERSATION VIEW WITH FIRST MESSAGE — Sends queued message after init
// ============================================================================

interface ConversationViewWithFirstMessageProps extends ConversationViewProps {
    firstMessage: { content: string; variables: Record<string, unknown> } | null;
    onFirstMessageSent: () => void;
}

function ConversationViewWithFirstMessage({
    firstMessage,
    onFirstMessageSent,
    agentId,
    apiMode,
    conversationId,
    chatModeConfig,
    variableDefaults,
    modelOverride,
    authenticated,
    onConversationIdChange,
}: ConversationViewWithFirstMessageProps) {
    const session = useConversationSession({
        agentId,
        apiMode,
        conversationId,
        loadHistory: !!conversationId,
        chatModeConfig,
        variableDefaults,
        modelOverride,
    });

    // Send first message after session initializes
    const sentRef = useRef(false);
    useEffect(() => {
        if (firstMessage && session.sessionId && !sentRef.current) {
            sentRef.current = true;
            // Small delay to ensure Redux session is fully initialized
            const timer = setTimeout(() => {
                session.send(firstMessage.content, {
                    variables: firstMessage.variables,
                });
                onFirstMessageSent();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [session.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Notify parent when conversation ID changes
    useEffect(() => {
        if (session.conversationId) {
            onConversationIdChange(session.conversationId);
        }
    }, [session.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sidebar notification on message completion
    useEffect(() => {
        if (session.status === 'ready' && session.conversationId && session.messages.length > 0) {
            window.dispatchEvent(new CustomEvent('chat:conversationUpdated', {
                detail: { id: session.conversationId },
            }));
        }
    }, [session.status, session.conversationId, session.messages.length]);

    return (
        <ConversationShell
            sessionId={session.sessionId}
            compact={false}
            inputProps={{
                showVoice: authenticated,
                showResourcePicker: authenticated,
                showModelPicker: false,
                showVariables: false,
                seamless: false,
            }}
        />
    );
}

// ============================================================================
// OUTER WRAPPER
// ============================================================================

export default function ChatWorkspace() {
    return <ChatWorkspaceInner />;
}
