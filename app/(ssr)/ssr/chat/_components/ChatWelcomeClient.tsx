'use client';

// app/(ssr)/ssr/chat/_components/ChatWelcomeClient.tsx
//
// Client island for the welcome screen interactive elements.
// Handles: input, variable inputs, mode buttons, submit, model picker.
// Does NOT alter the visible layout — the server component provides structure.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/slices/userSlice';
import {
    selectAvailableModels,
    fetchAvailableModels,
} from '@/lib/redux/slices/modelRegistrySlice';
import {
    activeChatActions,
    selectActiveChatAgent,
    selectIsAgentPickerOpen,
    type ActiveChatAgent,
} from '@/lib/redux/slices/activeChatSlice';
import { ChatInputWithControls } from '@/features/public-chat/components/ChatInputWithControls';
import {
    ResponseModeButtons,
    BackToStartButton,
    DEFAULT_AGENTS,
} from '@/features/public-chat/components/AgentSelector';
import { formatText } from '@/utils/text/text-case-converter';
import { computeSettingsOverrides } from '../_lib/settings-diff';
import type { WelcomeAgent } from './ChatWelcomeServer';
import type { PublicResource } from '@/features/public-chat/types/content';
import type {
    PromptVariable,
    PromptSettings,
} from '@/features/prompts/types/core';

// Lazy imports — only loaded when needed
const AgentPickerSheet = dynamic(
    () =>
        import('@/features/public-chat/components/AgentPickerSheet').then(m => ({
            default: m.AgentPickerSheet,
        })),
    { ssr: false },
);
const PublicVariableInputs = dynamic(
    () =>
        import('@/features/public-chat/components/PublicVariableInputs').then(
            m => ({ default: m.PublicVariableInputs }),
        ),
    { ssr: false },
);
const ModelSettingsDialog = dynamic(
    () =>
        import(
            '@/features/prompts/components/configuration/ModelSettingsDialog'
        ).then(m => ({ default: m.ModelSettingsDialog })),
    { ssr: false },
);

interface ChatWelcomeClientProps {
    agent: WelcomeAgent;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

export default function ChatWelcomeClient({
    agent,
    isAuthenticated: serverAuth,
    isAdmin: serverAdmin,
}: ChatWelcomeClientProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Client-side auth (may upgrade from server value after DeferredShellData)
    const user = useAppSelector(selectUser);
    const isAuthenticated = serverAuth || !!user?.id;

    const selectedAgent = useAppSelector(selectActiveChatAgent);
    const isAgentPickerOpen = useAppSelector(selectIsAgentPickerOpen);
    const availableModels = useAppSelector(selectAvailableModels);

    // Hydrate Redux with the server-provided agent on mount
    useEffect(() => {
        if (agent.promptId && agent.promptId !== selectedAgent.promptId) {
            dispatch(
                activeChatActions.setSelectedAgent({
                    promptId: agent.promptId,
                    name: agent.name,
                    description: agent.description,
                    variableDefaults: agent.variableDefaults as PromptVariable[],
                    configFetched: false,
                }),
            );
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch models on mount
    useEffect(() => {
        if (availableModels.length === 0) {
            dispatch(fetchAvailableModels());
        }
    }, [availableModels.length, dispatch]);

    // Variable state
    const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        agent.variableDefaults?.forEach(v => {
            if (v.defaultValue) initial[v.name] = v.defaultValue;
        });
        return initial;
    });
    const activeVariables = (agent.variableDefaults ?? []) as PromptVariable[];

    // Model override + settings
    const [modelOverride, setModelOverride] = useState<string | null>(null);
    const [modelSettings, setModelSettings] = useState<PromptSettings>({});
    // Agent's default settings — used to compute overrides
    const [agentDefaultSettings, setAgentDefaultSettings] = useState<PromptSettings>({});
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const variableInputRef = useRef<HTMLInputElement>(null);

    const CUSTOM_CHAT_PROMPT_ID = '3ca61863-43cf-49cd-8da5-7e0a4b192867';
    const isCustomChat = agent.promptId === CUSTOM_CHAT_PROMPT_ID;
    const hasVariables = activeVariables.length > 0;

    // Focus management — desktop only
    useEffect(() => {
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
    }, [activeVariables.length]);

    // Agent config fetch — load model/settings from DB after mount
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
                    setAgentDefaultSettings(restSettings as PromptSettings);
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
                    const fallback = DEFAULT_AGENTS.find(a => a.promptId === selectedAgent.promptId);
                    dispatch(
                        activeChatActions.setSelectedAgent({
                            ...selectedAgent,
                            name: fallback?.name || selectedAgent.name || 'Unknown Agent',
                            description: fallback?.description || selectedAgent.description,
                            variableDefaults: fallback?.variableDefaults ?? selectedAgent.variableDefaults,
                            configFetched: true,
                        }),
                    );
                }
            } catch {
                if (!cancelled) {
                    const fallback = DEFAULT_AGENTS.find(a => a.promptId === selectedAgent.promptId);
                    dispatch(
                        activeChatActions.setSelectedAgent({
                            ...selectedAgent,
                            name: fallback?.name || selectedAgent.name || 'Unknown Agent',
                            configFetched: true,
                        }),
                    );
                }
            }
        }

        loadConfig();
        return () => { cancelled = true; };
    }, [selectedAgent.promptId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle variable change
    const handleVariableChange = useCallback((name: string, value: string) => {
        setVariableValues(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handle first message submit → navigate to conversation
    const handleFirstSubmit = useCallback(
        async (content: string, resources?: PublicResource[]): Promise<boolean> => {
            let displayContent = '';

            if (activeVariables.length > 0) {
                const lines: string[] = [];
                activeVariables.forEach(varDef => {
                    const value = variableValues[varDef.name] || varDef.defaultValue || '';
                    if (value) {
                        lines.push(`${formatText(varDef.name)}: ${value}`);
                    }
                });
                displayContent = lines.length > 0
                    ? lines.join('\n') + (content.trim() ? '\n\n' + content : '')
                    : content;
            } else {
                displayContent = content;
            }

            if (!displayContent.trim()) return false;

            // Compute only the settings that differ from agent defaults
            const settingsOverrides = computeSettingsOverrides(agentDefaultSettings, modelSettings);

            // Store the first message in sessionStorage so the conversation page can pick it up
            sessionStorage.setItem(
                'ssr-chat-first-message',
                JSON.stringify({
                    content: displayContent,
                    variables: variableValues,
                    agentId: agent.promptId,
                    modelOverride,
                    modelSettings: settingsOverrides, // Only overrides, not full settings
                }),
            );

            // Navigate to a new conversation (c/new triggers conversation creation)
            router.push(`/ssr/chat/c/new?agent=${agent.promptId}`);
            return true;
        },
        [activeVariables, variableValues, agent.promptId, modelOverride, modelSettings, agentDefaultSettings, router],
    );

    // Handle agent select from picker
    const handleAgentSelect = useCallback(
        (pickedAgent: ActiveChatAgent) => {
            dispatch(activeChatActions.setSelectedAgent(pickedAgent));
            dispatch(activeChatActions.closeAgentPicker());
            router.push(`/ssr/chat/a/${pickedAgent.promptId}`);
        },
        [dispatch, router],
    );

    // Handle mode select (response mode buttons)
    const handleModeSelect = useCallback(
        (_modeId: string, agentId: string | null) => {
            if (!agentId) return;
            const match = DEFAULT_AGENTS.find(a => a.promptId === agentId);
            if (match) {
                dispatch(
                    activeChatActions.setSelectedAgent({
                        promptId: match.promptId,
                        name: match.name,
                        description: match.description,
                        variableDefaults: match.variableDefaults,
                    }),
                );
            }
            router.push(`/ssr/chat/a/${agentId}`);
        },
        [dispatch, router],
    );

    const handleBackToStart = useCallback(() => {
        router.push('/ssr/chat');
    }, [router]);

    return (
        <>
            {/* Agent picker sheet */}
            <AgentPickerSheet
                open={isAgentPickerOpen}
                onOpenChange={open => !open && dispatch(activeChatActions.closeAgentPicker())}
                selectedAgent={selectedAgent}
                onSelect={agent => handleAgentSelect(agent as ActiveChatAgent)}
            />

            {/* Variable inputs */}
            {hasVariables && (
                <div className={activeVariables.length > 2 ? 'mb-3 md:mb-6' : 'mb-6'}>
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

            {/* Chat input */}
            <div>
                <ChatInputWithControls
                    onSubmit={handleFirstSubmit}
                    disabled={false}
                    placeholder={
                        hasVariables
                            ? 'Additional instructions (optional)...'
                            : 'What do you want to know?'
                    }
                    conversationId={undefined}
                    isAuthenticated={isAuthenticated}
                    enableResourcePicker={isAuthenticated}
                    hasVariables={hasVariables}
                    selectedAgent={selectedAgent}
                    textInputRef={textInputRef}
                    availableModels={
                        selectedAgent.dynamicModel && availableModels.length > 0
                            ? availableModels
                            : undefined
                    }
                    selectedModel={modelOverride ?? undefined}
                    onModelChange={id => setModelOverride(id || null)}
                    onSettingsClick={
                        isAuthenticated ? () => setIsSettingsOpen(true) : undefined
                    }
                />
            </div>

            {/* Settings dialog — only when user clicks settings icon */}
            {isSettingsOpen && (
                <ModelSettingsDialog
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    modelId={modelOverride ?? ''}
                    models={availableModels}
                    settings={{
                        model_id: modelOverride ?? undefined,
                        ...modelSettings,
                    }}
                    onSettingsChange={(newSettings: PromptSettings) => {
                        const { model_id, ...rest } = newSettings;
                        if (model_id) setModelOverride(model_id);
                        setModelSettings(rest);
                    }}
                    showModelSelector={true}
                    onModelChange={id => setModelOverride(id || null)}
                    requireConfirmation={!isCustomChat}
                />
            )}

            {/* Mode buttons / back button */}
            <div className="flex items-center justify-between mt-3 md:mt-6 pb-safe">
                {hasVariables ? (
                    <BackToStartButton
                        onBack={handleBackToStart}
                        agentName={agent.name || undefined}
                    />
                ) : (
                    <ResponseModeButtons
                        disabled={false}
                        selectedAgentId={agent.promptId}
                        onModeSelect={handleModeSelect}
                    />
                )}
            </div>
        </>
    );
}
