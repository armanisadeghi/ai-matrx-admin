// lib/redux/slices/promptCacheSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { PromptMessage, PromptSettings, PromptVariable } from '@/features/prompts/types/core';

/**
 * Prompt Cache Slice
 * 
 * Stores fetched prompts in Redux to avoid redundant database queries.
 * Prompts are cached for the entire session after first fetch.
 * 
 * Benefits:
 * - Fetch once, use forever
 * - Instant prompt opening (no loading state)
 * - Reduced database load
 * - Future: Pre-fetch common prompts after login
 */

export interface CachedPrompt {
  id: string;
  name: string;
  description?: string;
  messages: PromptMessage[];
  variableDefaults?: PromptVariable[];
  settings: PromptSettings;
  userId: string;
  source: 'prompts' | 'prompt_builtins'; // Which table this came from
  fetchedAt: number; // Timestamp when fetched
  status: 'cached' | 'stale'; // For future cache invalidation
}

export interface PromptCacheState {
  prompts: {
    [promptId: string]: CachedPrompt;
  };
  // Track fetch status for prompts currently being fetched
  fetchStatus: {
    [promptId: string]: 'idle' | 'loading' | 'success' | 'error';
  };
}

const initialState: PromptCacheState = {
  prompts: {},
  fetchStatus: {},
};

const promptCacheSlice = createSlice({
  name: 'promptCache',
  initialState,
  reducers: {
    // Add or update a prompt in cache
    cachePrompt: (state, action: PayloadAction<CachedPrompt>) => {
      const prompt = action.payload;
      state.prompts[prompt.id] = prompt;
      state.fetchStatus[prompt.id] = 'success';
    },

    // Update fetch status (for loading states)
    setFetchStatus: (state, action: PayloadAction<{ promptId: string; status: 'idle' | 'loading' | 'success' | 'error' }>) => {
      const { promptId, status } = action.payload;
      state.fetchStatus[promptId] = status;
    },

    // Remove a prompt from cache (if needed for cache invalidation)
    removePrompt: (state, action: PayloadAction<string>) => {
      const promptId = action.payload;
      delete state.prompts[promptId];
      delete state.fetchStatus[promptId];
    },

    // Mark prompt as stale (for future cache invalidation)
    markPromptStale: (state, action: PayloadAction<string>) => {
      const promptId = action.payload;
      if (state.prompts[promptId]) {
        state.prompts[promptId].status = 'stale';
      }
    },

    // Clear entire cache (useful for logout)
    clearCache: (state) => {
      state.prompts = {};
      state.fetchStatus = {};
    },
  },
});

// Selectors
export const selectCachedPrompt = (state: RootState, promptId: string) =>
  state.promptCache?.prompts[promptId] || null;

export const selectIsPromptCached = (state: RootState, promptId: string) =>
  !!state.promptCache?.prompts[promptId];

export const selectPromptFetchStatus = (state: RootState, promptId: string) =>
  state.promptCache?.fetchStatus[promptId] || 'idle';

export const selectAllCachedPrompts = (state: RootState) =>
  state.promptCache?.prompts || {};

export const {
  cachePrompt,
  setFetchStatus,
  removePrompt,
  markPromptStale,
  clearCache,
} = promptCacheSlice.actions;

export default promptCacheSlice.reducer;

