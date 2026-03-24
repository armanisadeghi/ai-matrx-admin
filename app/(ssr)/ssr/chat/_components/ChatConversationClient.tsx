'use client';

// app/(ssr)/ssr/chat/_components/ChatConversationClient.tsx
//
// Client island for active conversations. Renders the unified ConversationShell
// and handles first-message sending from the welcome screen transition.
//
// Dynamic imports for ConversationShell to reduce bundle size —
// only needed when viewing a conversation.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/slices/userSlice';
import {
    activeChatActions,
    selectActiveChatAgent,
    selectIsAgentPickerOpen,
    type ActiveChatAgent,
} from '@/lib/redux/slices/activeChatSlice';
import { useConversationSession } from '@/features/cx-conversation/hooks/useConversationSession';
import { chatConversationsActions } from '@/features/cx-conversation/redux/slice';
import type { PromptVariable, PromptSettings } from '@/features/prompts/types/core';
import type { ApiMode } from '@/features/cx-conversation/redux/types';
import { DEFAULT_AGENTS } from '@/features/public-chat/components/AgentSelector';

const ConversationShell = dynamic(
    () =>
        import('@/features/cx-conversation/ConversationShell').then(m => ({
            default: m.ConversationShell,
        })),
    { ssr: false },
);
const AgentPickerSheet = dynamic(
    () =>
        import('@/features/public-chat/components/AgentPickerSheet').then(m => ({
            default: m.AgentPickerSheet,
        })),
    { ssr: false },
);

interface ChatConversationClientProps {
    conversationId: string;
    agentId?: string;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

export default function ChatConversationClient({
    conversationId,
    agentId,
    isAuthenticated: serverAuth,
    isAdmin,
}: ChatConversationClientProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const isAuthenticated = serverAuth || !!user?.id;
    const selectedAgent = useAppSelector(selectActiveChatAgent);
    const isAgentPickerOpen = useAppSelector(selectIsAgentPickerOpen);

    const [modelOverride, setModelOverride] = useState<string | null>(null);
    const [modelSettings, setModelSettings] = useState<PromptSettings>({});

    // Check for first message from welcome screen transition
    const [firstMessage, setFirstMessage] = useState<{
        content: string;
        variables: Record<string, unknown>;
    } | null>(null);

    // Is this a "new" conversation (just submitted from welcome)?
    const isNewConversation = conversationId === 'new';
    const effectiveConversationId = isNewConversation ? undefined : conversationId;

    // Resolve agent ID — from prop, URL, or Redux
    const effectiveAgentId = agentId || selectedAgent.promptId;

    // On mount: pick up first message + settings from sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem('ssr-chat-first-message');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setFirstMessage({ content: parsed.content, variables: parsed.variables });
                if (parsed.modelOverride) setModelOverride(parsed.modelOverride);
                if (parsed.modelSettings) setModelSettings(parsed.modelSettings);
                if (parsed.agentId && parsed.agentId !== selectedAgent.promptId) {
                    const builtIn = DEFAULT_AGENTS.find(a => a.promptId === parsed.agentId);
                    if (builtIn) {
                        dispatch(
                            activeChatActions.setSelectedAgent({
                                promptId: builtIn.promptId,
                                name: builtIn.name,
                                description: builtIn.description,
                                variableDefaults: builtIn.variableDefaults,
                                configFetched: true,
                            }),
                        );
                    }
                }
            } catch { /* ignore parse errors */ }
            sessionStorage.removeItem('ssr-chat-first-message');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Set active session in Redux
    useEffect(() => {
        if (effectiveConversationId) {
            dispatch(activeChatActions.setActiveSessionId(effectiveConversationId));
        }
        return () => {
            dispatch(activeChatActions.clearActiveSession());
        };
    }, [effectiveConversationId, dispatch]);

    // Agent config fetch (same pattern as welcome)
    useEffect(() => {
        if (!selectedAgent.promptId || selectedAgent.configFetched) return;
        let cancelled = false;

        async function loadConfig() {
            try {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('prompts')
                    .select('id, name, description, variable_defaults, settings, dynamic_model')
                    .eq('id', selectedAgent.promptId)
                    .single();

                if (cancelled) return;

                if (data && !error) {
                    const settings = (data.settings ?? {}) as Record<string, unknown>;
                    const { model_id, ...restSettings } = settings;
                    const resolvedModelId = typeof model_id === 'string' ? model_id : null;
                    setModelOverride(resolvedModelId);
                    setModelSettings(restSettings as PromptSettings);
                    dispatch(
                        activeChatActions.setSelectedAgent({
                            ...selectedAgent,
                            name: data.name || selectedAgent.name || 'Unknown Agent',
                            description: (data.description ?? selectedAgent.description) || undefined,
                            variableDefaults: data.variable_defaults ?? selectedAgent.variableDefaults ?? undefined,
                            modelOverride: resolvedModelId,
                            modelSettings: restSettings as PromptSettings,
                            dynamicModel: data.dynamic_model === true,
                            configFetched: true,
                        }),
                    );
                } else {
                    dispatch(
                        activeChatActions.setSelectedAgent({
                            ...selectedAgent,
                            configFetched: true,
                        }),
                    );
                }
            } catch {
                if (!cancelled) {
                    dispatch(activeChatActions.setSelectedAgent({ ...selectedAgent, configFetched: true }));
                }
            }
        }

        loadConfig();
        return () => { cancelled = true; };
    }, [selectedAgent.promptId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNewChat = useCallback(() => {
        dispatch(activeChatActions.setActiveSessionId(null));
        router.push('/ssr/chat');
    }, [dispatch, router]);

    const handleAgentSelect = useCallback(
        (pickedAgent: ActiveChatAgent) => {
            dispatch(activeChatActions.setSelectedAgent(pickedAgent));
            dispatch(activeChatActions.closeAgentPicker());
            dispatch(activeChatActions.setActiveSessionId(null));
            router.push(`/ssr/chat/a/${pickedAgent.promptId}`);
        },
        [dispatch, router],
    );

    const agentName = selectedAgent?.name || 'Chat';

    return (
        <>
            <AgentPickerSheet
                open={isAgentPickerOpen}
                onOpenChange={open => !open && dispatch(activeChatActions.closeAgentPicker())}
                selectedAgent={selectedAgent}
                onSelect={agent => handleAgentSelect(agent as ActiveChatAgent)}
            />

            <div className="h-full flex flex-col overflow-hidden">
                <ConversationViewWithFirstMessage
                    agentId={effectiveAgentId}
                    apiMode="agent"
                    conversationId={effectiveConversationId}
                    variableDefaults={selectedAgent.variableDefaults}
                    modelOverride={modelOverride ?? undefined}
                    modelSettings={modelSettings}
                    authenticated={isAuthenticated}
                    firstMessage={firstMessage}
                    onFirstMessageSent={() => setFirstMessage(null)}
                />
            </div>
        </>
    );
}

// ============================================================================
// CONVERSATION VIEW — sends first message after session init + syncs URL
// ============================================================================

interface ConversationViewWithFirstMessageProps {
    agentId: string;
    apiMode: ApiMode;
    conversationId?: string;
    variableDefaults?: PromptVariable[];
    modelOverride?: string;
    modelSettings?: PromptSettings;
    authenticated: boolean;
    firstMessage: { content: string; variables: Record<string, unknown> } | null;
    onFirstMessageSent: () => void;
}

function ConversationViewWithFirstMessage({
    firstMessage,
    onFirstMessageSent,
    agentId,
    apiMode,
    conversationId,
    variableDefaults,
    modelOverride,
    modelSettings,
    authenticated,
}: ConversationViewWithFirstMessageProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const session = useConversationSession({
        agentId,
        apiMode,
        conversationId,
        loadHistory: !!conversationId,
        variableDefaults,
        modelOverride,
    });

    // Sync model settings to Redux uiState
    useEffect(() => {
        if (session.sessionId && modelSettings && Object.keys(modelSettings).length > 0) {
            dispatch(
                chatConversationsActions.updateUIState({
                    sessionId: session.sessionId,
                    updates: { modelSettings: modelSettings as Record<string, unknown> },
                }),
            );
        }
    }, [session.sessionId, modelSettings, dispatch]);

    // Send first message after session initializes.
    // firstMessage is set asynchronously (sessionStorage read in parent effect),
    // so we must watch it as a dependency — it's null on first render.
    const sentRef = useRef(false);
    useEffect(() => {
        if (firstMessage && session.sessionId && !sentRef.current) {
            sentRef.current = true;
            // Small delay ensures Redux session is fully initialized
            const timer = setTimeout(() => {
                session.send(firstMessage.content, { variables: firstMessage.variables });
                onFirstMessageSent();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [firstMessage, session.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    // URL sync: when conversation ID is created, update URL
    const lastSyncedId = useRef<string | null>(conversationId ?? null);
    useEffect(() => {
        if (session.conversationId && session.conversationId !== lastSyncedId.current) {
            lastSyncedId.current = session.conversationId;
            // Replace URL to canonical conversation route (no page reload)
            router.replace(`/ssr/chat/c/${session.conversationId}?agent=${agentId}`);
            dispatch(activeChatActions.setActiveSessionId(session.conversationId));

            // Notify sidebar
            window.dispatchEvent(
                new CustomEvent('chat:conversationCreated', {
                    detail: { id: session.conversationId, title: 'New Chat' },
                }),
            );
        }
    }, [session.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sidebar notification on message completion
    useEffect(() => {
        if (session.status === 'ready' && session.conversationId && session.messages.length > 0) {
            window.dispatchEvent(
                new CustomEvent('chat:conversationUpdated', {
                    detail: { id: session.conversationId },
                }),
            );
        }
    }, [session.status, session.conversationId, session.messages.length]);

    // Derive attachment capabilities
    const derivedCapabilities = modelSettings
        ? {
              supportsImageUrls: modelSettings.image_urls !== false,
              supportsFileUrls: modelSettings.file_urls !== false,
              supportsYoutubeVideos: modelSettings.youtube_videos !== false,
              supportsAudio: true,
          }
        : undefined;

    return (
        <ConversationShell
            sessionId={session.sessionId}
            compact={false}
            inputProps={{
                showVoice: authenticated,
                showResourcePicker: authenticated,
                showSettings: authenticated,
                showModelPicker: false,
                showVariables: false,
                seamless: false,
                attachmentCapabilities: derivedCapabilities,
            }}
        />
    );
}
