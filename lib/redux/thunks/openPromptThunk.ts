// lib/redux/thunks/openPromptThunk.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../store';
import { supabase } from '@/utils/supabase/client';
import {
  cachePrompt,
  setFetchStatus,
  selectCachedPrompt,
  selectPromptFetchStatus,
  CachedPrompt,
} from '../slices/promptCacheSlice';
import { openPromptModal } from '../slices/promptRunnerSlice';
import { PromptRunnerModalConfig } from '@/features/prompts/types/modal';

/**
 * Smart Thunk for Opening Prompts
 * 
 * This thunk handles the intelligent opening of prompt runner modals:
 * 1. If promptData is provided, use it directly
 * 2. If promptId is provided, check cache first
 * 3. Fetch from database only if not cached
 * 4. Open modal with resolved prompt data
 * 
 * Benefits:
 * - Single API for opening prompts
 * - Automatic caching (fetch once per session)
 * - No loading states for cached prompts
 * - Reduced database queries
 * 
 * @example
 * ```tsx
 * // With prompt ID (will cache automatically)
 * dispatch(openPrompt({
 *   promptId: 'text-analyzer',
 *   mode: 'auto-run',
 *   variables: { text: selectedText }
 * }));
 * 
 * // With prompt data (skip cache/fetch)
 * dispatch(openPrompt({
 *   promptData: myPromptObject,
 *   mode: 'manual'
 * }));
 * ```
 */
export const openPrompt = createAsyncThunk<
  void,
  PromptRunnerModalConfig,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptRunner/openPrompt',
  async (config, { dispatch, getState }) => {
    try {
      let resolvedConfig = { ...config };

      // If promptData is provided, use it directly
      if (config.promptData) {
        // Already have prompt data, just open the modal
        dispatch(openPromptModal(resolvedConfig));
        return;
      }

      // If promptId is provided, check cache or fetch
      if (config.promptId) {
        const state = getState();
        const cachedPrompt = selectCachedPrompt(state, config.promptId);
        const fetchStatus = selectPromptFetchStatus(state, config.promptId);

        // Use cached prompt if available
        if (cachedPrompt) {
          resolvedConfig.promptData = {
            id: cachedPrompt.id,
            name: cachedPrompt.name,
            description: cachedPrompt.description,
            messages: cachedPrompt.messages,
            variableDefaults: cachedPrompt.variableDefaults || cachedPrompt.variable_defaults,
            settings: cachedPrompt.settings,
          };
          dispatch(openPromptModal(resolvedConfig));
          return;
        }

        // Prevent duplicate fetches
        if (fetchStatus === 'loading') {
          console.warn(`[openPrompt] Prompt ${config.promptId} is already being fetched`);
          return;
        }

        // Fetch from database
        dispatch(setFetchStatus({ promptId: config.promptId, status: 'loading' }));

        const { data: prompt, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('id', config.promptId)
          .single();

        if (error || !prompt) {
          dispatch(setFetchStatus({ promptId: config.promptId, status: 'error' }));
          console.error(`[openPrompt] Failed to fetch prompt ${config.promptId}:`, error);
          throw new Error(`Prompt not found: ${config.promptId}`);
        }

        // Cache the fetched prompt
        const cachedPromptData: CachedPrompt = {
          id: prompt.id,
          name: prompt.name,
          description: prompt.description,
          messages: prompt.messages || [],
          variableDefaults: prompt.variable_defaults || [],
          variable_defaults: prompt.variable_defaults || [],
          settings: prompt.settings || {},
          fetchedAt: Date.now(),
          status: 'cached',
        };

        dispatch(cachePrompt(cachedPromptData));

        // Add prompt data to config and open modal
        resolvedConfig.promptData = {
          id: cachedPromptData.id,
          name: cachedPromptData.name,
          description: cachedPromptData.description,
          messages: cachedPromptData.messages,
          variableDefaults: cachedPromptData.variableDefaults,
          settings: cachedPromptData.settings,
        };

        dispatch(openPromptModal(resolvedConfig));
        return;
      }

      // Neither promptId nor promptData provided
      throw new Error('Either promptId or promptData must be provided to openPrompt');

    } catch (error) {
      console.error('[openPrompt] Error:', error);
      throw error;
    }
  }
);

/**
 * Helper function to pre-fetch and cache prompts without opening
 * Useful for pre-loading commonly used prompts after login
 * 
 * @example
 * ```tsx
 * // Pre-load common prompts after login
 * dispatch(prefetchPrompt('text-analyzer'));
 * dispatch(prefetchPrompt('code-reviewer'));
 * ```
 */
export const prefetchPrompt = createAsyncThunk<
  void,
  string, // promptId
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptCache/prefetchPrompt',
  async (promptId, { dispatch, getState }) => {
    try {
      const state = getState();
      const cachedPrompt = selectCachedPrompt(state, promptId);

      // Skip if already cached
      if (cachedPrompt) {
        return;
      }

      dispatch(setFetchStatus({ promptId, status: 'loading' }));

      const { data: prompt, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .single();

      if (error || !prompt) {
        dispatch(setFetchStatus({ promptId, status: 'error' }));
        console.error(`[prefetchPrompt] Failed to fetch prompt ${promptId}:`, error);
        return;
      }

      // Cache the fetched prompt
      const cachedPromptData: CachedPrompt = {
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        messages: prompt.messages || [],
        variableDefaults: prompt.variable_defaults || [],
        variable_defaults: prompt.variable_defaults || [],
        settings: prompt.settings || {},
        fetchedAt: Date.now(),
        status: 'cached',
      };

      dispatch(cachePrompt(cachedPromptData));

    } catch (error) {
      console.error('[prefetchPrompt] Error:', error);
    }
  }
);

