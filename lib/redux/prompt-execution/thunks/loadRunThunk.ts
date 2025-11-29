import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import { createClient } from '@/utils/supabase/client';
import {
    createInstance,
    addMessage,
    updateVariables,
    setRunId,
    setInstanceStatus
} from '../slice';
import type { ExecutionInstance, ConversationMessage } from '../types';
import { PromptDb } from '@/features/prompts';

interface LoadRunPayload {
    runId: string;
    forceRefresh?: boolean;
}

export const loadRun = createAsyncThunk<
    void,
    LoadRunPayload,
    {
        dispatch: AppDispatch;
        state: RootState;
    }
>(
    'promptExecution/loadRun',
    async ({ runId, forceRefresh = false }, { dispatch, getState }) => {
        const state = getState();

        // Check if run already exists in state
        const existingInstance = state.promptExecution.instances[runId];
        if (existingInstance && !forceRefresh) {
            // Already loaded, no need to re-fetch unless forced
            return;
        }

        try {
            const supabase = createClient();

            // Fetch run from database
            const { data: run, error } = await supabase
                .from('ai_runs')
                .select('*')
                .eq('id', runId)
                .single();

            if (error || !run) {
                throw new Error(error?.message || `Run not found: ${runId}`);
            }

            // Fetch prompt data to get defaults and settings if needed
            // We use the source_id from the run to fetch the prompt
            let fetchedPromptData = null as PromptDb | null;
            if (run.source_type === 'prompt' && run.source_id) {
                const { data: prompt } = await supabase
                    .from('prompts')
                    .select('*')
                    .eq('id', run.source_id)
                    .single();
                fetchedPromptData = prompt;
            }

            // Prepare instance data
            const now = Date.now();
            const instance: ExecutionInstance = {
                runId: run.id,
                promptId: run.source_id || 'unknown',
                promptSource: run.source_type || 'prompt',
                status: 'ready', // Or 'completed' if run is done? For now 'ready' allows continuing
                error: null,
                createdAt: new Date(run.created_at).getTime(),
                updatedAt: now,

                // Use settings from run, fallback to prompt settings
                settings: run.settings || fetchedPromptData?.settings || {},

                executionConfig: {
                    auto_run: false, // Don't auto-run loaded historical runs
                    allow_chat: true,
                    show_variables: false,
                    apply_variables: true,
                    track_in_runs: true,
                },

                variables: {
                    userValues: run.variable_values || {},
                    scopedValues: {},
                    computedValues: {},
                },
                variableDefaults: fetchedPromptData?.variable_defaults || [],

                messages: [], // Will be populated below

                // Loaded runs have already been processed - no variable replacement needed
                requiresVariableReplacement: false,

                execution: {
                    currentTaskId: null,
                    messageStartTime: null,
                    timeToFirstToken: undefined,
                    lastMessageStats: null,
                },

                runTracking: {
                    sourceType: run.source_type || 'prompt',
                    sourceId: run.source_id || 'unknown',
                    runName: run.name,
                    totalTokens: 0, // Could calculate from messages if needed
                    totalCost: 0,
                    savedToDatabase: true,
                },
            };

            // Initialize instance
            dispatch(createInstance(instance));

            // Add messages
            if (run.messages && Array.isArray(run.messages)) {
                run.messages.forEach((msg: any) => {
                    const message: ConversationMessage = {
                        role: msg.role,
                        content: msg.content,
                        taskId: msg.taskId,
                        timestamp: msg.timestamp || new Date().toISOString(),
                        metadata: msg.metadata,
                    };
                    dispatch(addMessage({ runId, message }));
                });
            }

            // Set run ID tracking
            dispatch(setRunId({
                runId,
                runName: run.name,
                savedToDatabase: true
            }));

            console.log('✅ Run loaded:', runId);

        } catch (error) {
            console.error('❌ Failed to load run:', error);
            // We might want to set an error state on a placeholder instance if it fails
            // But for now just log
            throw error;
        }
    }
);
