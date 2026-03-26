'use client';

// app/(ssr)/ssr/chat/_components/ChatWelcomeClient.tsx
//
// Client island for the welcome screen.
// Handles: input, variable inputs (guided + classic), mode buttons,
// submit, model picker, settings, agent picker.
//
// Dual variable modes:
//   - Guided (default): wizard-style, one variable at a time, bottom-pinned layout
//   - Classic (?vars=classic): all variables visible at once, centered layout
//
// All shared state flows through Redux (activeChatSlice).

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { List, Layers } from 'lucide-react';
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
    selectModelOverride,
    selectModelSettings,
    selectAgentDefaultSettings,
    type ActiveChatAgent,
} from '@/lib/redux/slices/activeChatSlice';
import { useAgentConfig } from '../_lib/useAgentConfig';
import { ChatInputWithControls } from '@/features/public-chat/components/ChatInputWithControls';
import {
    ResponseModeButtons,
    BackToStartButton,
    DEFAULT_AGENTS,
} from '@/features/public-chat/components/AgentSelector';
import { formatText } from '@/utils/text/text-case-converter';
import { DEFAULT_AGENT_ID } from '../_lib/agents';
import type { WelcomeAgent } from './ChatWelcomeServer';
import type { PublicResource } from '@/features/public-chat/types/content';
import type { PromptVariable, PromptSettings } from '@/features/prompts/types/core';

const SsrAgentPickerSheet = dynamic(
    () => import('./SsrAgentPickerSheet').then(m => ({ default: m.SsrAgentPickerSheet })),
    { ssr: false },
);
const PublicVariableInputs = dynamic(
    () => import('@/features/public-chat/components/PublicVariableInputs').then(m => ({ default: m.PublicVariableInputs })),
    { ssr: false },
);
const GuidedVariableInputs = dynamic(
    () => import('@/features/public-chat/components/GuidedVariableInputs').then(m => ({ default: m.GuidedVariableInputs })),
    { ssr: false },
);
const ModelSettingsDialog = dynamic(
    () => import('@/features/prompts/components/configuration/ModelSettingsDialog').then(m => ({ default: m.ModelSettingsDialog })),
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
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    const user = useAppSelector(selectUser);
    const isAuthenticated = serverAuth || !!user?.id;

    const selectedAgent = useAppSelector(selectActiveChatAgent);
    const isAgentPickerOpen = useAppSelector(selectIsAgentPickerOpen);
    const availableModels = useAppSelector(selectAvailableModels);
    const modelOverride = useAppSelector(selectModelOverride);
    const modelSettings = useAppSelector(selectModelSettings);
    const agentDefaultSettings = useAppSelector(selectAgentDefaultSettings);

    useAgentConfig();

    // Guided vs classic variable mode
    const useGuidedVars = searchParams.get('vars') !== 'classic';

    const toggleUrl = useMemo(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (useGuidedVars) {
            params.set('vars', 'classic');
        } else {
            params.delete('vars');
        }
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }, [useGuidedVars, searchParams, pathname]);

    // Hydrate Redux with the server-provided agent on mount
    useEffect(() => {
        if (agent.promptId && agent.promptId !== selectedAgent.promptId) {
            dispatch(
                activeChatActions.setSelectedAgent({
                    promptId: agent.promptId,
                    name: agent.name,
                    description: agent.description,
                    variableDefaults: agent.variableDefaults,
                    configFetched: false,
                }),
            );
            dispatch(activeChatActions.resetModelState());
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (availableModels.length === 0) {
            dispatch(fetchAvailableModels());
        }
    }, [availableModels.length, dispatch]);

    // Variable state
    const activeVariables: PromptVariable[] = (selectedAgent.configFetched
        ? selectedAgent.variableDefaults
        : agent.variableDefaults) ?? [];

    const [variableValues, setVariableValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        agent.variableDefaults?.forEach(v => {
            if (v.defaultValue) initial[v.name] = v.defaultValue;
        });
        return initial;
    });

    useEffect(() => {
        if (!selectedAgent.configFetched) return;
        const vars = selectedAgent.variableDefaults ?? [];
        if (vars.length === 0) return;
        setVariableValues(prev => {
            const next: Record<string, string> = {};
            vars.forEach(v => {
                next[v.name] = prev[v.name] ?? v.defaultValue ?? '';
            });
            return next;
        });
    }, [selectedAgent.configFetched, selectedAgent.variableDefaults]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const variableInputRef = useRef<HTMLInputElement>(null);

    const CUSTOM_CHAT_PROMPT_ID = '3ca61863-43cf-49cd-8da5-7e0a4b192867';
    const isCustomChat = agent.promptId === CUSTOM_CHAT_PROMPT_ID;
    const hasVariables = activeVariables.length > 0;
    const varCount = activeVariables.length;
    const showDescription = agent.description && varCount <= 3;

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

    const handleVariableChange = useCallback((name: string, value: string) => {
        setVariableValues(prev => ({ ...prev, [name]: value }));
    }, []);

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

            dispatch(activeChatActions.setFirstMessage({
                content: displayContent,
                variables: variableValues,
            }));

            router.push(`/ssr/chat/c/new?agent=${agent.promptId}&new=true`);
            return true;
        },
        [activeVariables, variableValues, agent.promptId, router, dispatch],
    );

    const handleAgentSelect = useCallback(
        (pickedAgent: ActiveChatAgent) => {
            dispatch(activeChatActions.setSelectedAgent(pickedAgent));
            dispatch(activeChatActions.closeAgentPicker());
            dispatch(activeChatActions.resetModelState());
            router.push(`/ssr/chat/a/${pickedAgent.promptId}`);
        },
        [dispatch, router],
    );

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
                dispatch(activeChatActions.resetModelState());
            }
            router.push(`/ssr/chat/a/${agentId}`);
        },
        [dispatch, router],
    );

    const handleBackToStart = useCallback(() => {
        router.push(`/ssr/chat/a/${DEFAULT_AGENT_ID}`);
    }, [router]);

    // ── Shared sub-elements ──────────────────────────────────────────

    const agentPickerEl = (
        <SsrAgentPickerSheet
            open={isAgentPickerOpen}
            onOpenChange={open => !open && dispatch(activeChatActions.closeAgentPicker())}
            selectedAgent={selectedAgent}
            onSelect={a => handleAgentSelect(a as ActiveChatAgent)}
        />
    );

    const settingsEl = isSettingsOpen && (
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
                if (model_id) dispatch(activeChatActions.setModelOverride(model_id));
                dispatch(activeChatActions.setModelSettings(rest));
            }}
            showModelSelector={true}
            onModelChange={id => dispatch(activeChatActions.setModelOverride(id || null))}
            requireConfirmation={!isCustomChat}
        />
    );

    const chatInputEl = (seamless: boolean) => (
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
            onModelChange={id => dispatch(activeChatActions.setModelOverride(id || null))}
            onSettingsClick={
                isAuthenticated ? () => setIsSettingsOpen(true) : undefined
            }
            seamless={seamless}
        />
    );

    const toggleButton = hasVariables && (
        <button
            type="button"
            onClick={() => router.replace(toggleUrl)}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
            title={useGuidedVars ? 'Switch to classic variable view' : 'Switch to guided variable view'}
        >
            {useGuidedVars ? <List className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
        </button>
    );

    // ── GUIDED MODE: bottom-pinned layout ───────────────────────────

    if (useGuidedVars && hasVariables) {
        return (
            <>
                {agentPickerEl}
                {settingsEl}

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                    <div className="flex flex-col items-center justify-end min-h-full px-3 md:px-8 pb-4">
                        <div className="w-full max-w-3xl text-center">
                            <h1 className={`font-semibold text-foreground ${
                                varCount > 2 ? 'text-xl md:text-3xl' : 'text-2xl md:text-3xl'
                            }`}>
                                {agent.name || 'What can I help with?'}
                            </h1>
                            {showDescription && (
                                <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                    {agent.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="flex-shrink-0 px-2 md:px-4 bg-transparent md:bg-background/95 md:backdrop-blur-sm"
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
                        <div className="rounded-b-2xl bg-background">
                            {chatInputEl(true)}
                        </div>
                        <div className="flex items-center justify-between mt-3 pb-2">
                            <BackToStartButton onBack={handleBackToStart} agentName={agent.name || undefined} />
                            {toggleButton}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── CLASSIC MODE (or no variables): centered layout ─────────────

    return (
        <>
            {agentPickerEl}
            {settingsEl}

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className={`min-h-full flex flex-col items-center px-3 md:px-8 ${
                    varCount > 2
                        ? 'justify-start pt-8 md:pt-16 md:justify-center'
                        : 'justify-center'
                }`}>
                    <div className="w-full max-w-3xl">
                        <div className={`text-center ${
                            varCount > 2 ? 'mb-3 md:mb-6' : 'mb-6 md:mb-8'
                        }`}>
                            <h1 className={`font-semibold text-foreground ${
                                varCount > 2 ? 'text-xl md:text-3xl' : 'text-2xl md:text-3xl'
                            }`}>
                                {agent.name || 'What can I help with?'}
                            </h1>
                            {showDescription ? (
                                <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                    {agent.description}
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
                            {chatInputEl(false)}
                        </div>

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
                            {toggleButton}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
