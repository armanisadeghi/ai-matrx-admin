'use client';

// app/(ssr)/ssr/chat/_lib/useAgentConfig.ts
//
// Shared hook that loads full agent configuration from DB when needed.
// Used by both ChatWelcomeClient and ChatConversationClient to avoid
// duplicating the Supabase fetch + Redux dispatch logic.
//
// Flow:
//   1. Check if agent is already configFetched in Redux → skip
//   2. Check BUILTIN_AGENTS for instant sync resolution → skip DB
//   3. Fall back to Supabase query for unknown agents
//   4. Dispatch full config (including settings for dirty detection) to Redux

import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    activeChatActions,
    selectActiveChatAgent,
    type ActiveChatAgent,
} from '@/lib/redux/slices/activeChatSlice';
import { BUILTIN_AGENTS } from './agents';
import type { PromptSettings } from '@/features/prompts/types/core';

export function useAgentConfig() {
    const dispatch = useAppDispatch();
    const selectedAgent = useAppSelector(selectActiveChatAgent);

    useEffect(() => {
        if (!selectedAgent.promptId || selectedAgent.configFetched) return;

        const builtIn = BUILTIN_AGENTS[selectedAgent.promptId];
        if (builtIn) {
            dispatch(activeChatActions.setSelectedAgent({
                promptId: builtIn.promptId,
                name: builtIn.name,
                description: builtIn.description,
                variableDefaults: builtIn.variableDefaults,
                configFetched: true,
            }));
            return;
        }

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

                    dispatch(activeChatActions.setSelectedAgent({
                        promptId: data.id,
                        name: data.name || selectedAgent.name || 'Unknown Agent',
                        description: (data.description ?? selectedAgent.description) || undefined,
                        variableDefaults: data.variable_defaults ?? selectedAgent.variableDefaults ?? undefined,
                        dynamicModel: data.dynamic_model === true,
                        configFetched: true,
                    }));

                    dispatch(activeChatActions.setModelOverride(resolvedModelId));
                    dispatch(activeChatActions.setModelSettings(restSettings as PromptSettings));
                    dispatch(activeChatActions.setAgentDefaultSettings(restSettings as PromptSettings));
                } else {
                    dispatch(activeChatActions.setSelectedAgent({
                        ...selectedAgent,
                        name: selectedAgent.name || 'Unknown Agent',
                        configFetched: true,
                    }));
                }
            } catch {
                if (!cancelled) {
                    dispatch(activeChatActions.setSelectedAgent({
                        ...selectedAgent,
                        name: selectedAgent.name || 'Unknown Agent',
                        configFetched: true,
                    }));
                }
            }
        }

        loadConfig();
        return () => { cancelled = true; };
    }, [selectedAgent.promptId]); // eslint-disable-line react-hooks/exhaustive-deps
}
