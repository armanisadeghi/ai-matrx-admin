/**
 * Action Cache Redux Slice
 * 
 * Caches prompt actions to avoid repeated database fetches
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { PromptAction } from '@/features/prompt-actions/types';

/**
 * Cached action with fetch metadata
 */
interface CachedAction extends PromptAction {
  fetchedAt: number;
  status: 'cached' | 'stale';
}

/**
 * Action cache state
 */
interface ActionCacheState {
  /** Map of action ID to cached action */
  actions: {
    [actionId: string]: CachedAction;
  };

  /** Fetch status for each action */
  fetchStatus: {
    [actionId: string]: 'idle' | 'loading' | 'success' | 'error';
  };

  /** Error messages for failed fetches */
  errors: {
    [actionId: string]: string;
  };
}

const initialState: ActionCacheState = {
  actions: {},
  fetchStatus: {},
  errors: {},
};

/**
 * Action Cache Slice
 */
const actionCacheSlice = createSlice({
  name: 'actionCache',
  initialState,
  reducers: {
    /**
     * Cache an action
     */
    cacheAction: (state, action: PayloadAction<PromptAction>) => {
      const actionData = action.payload;
      state.actions[actionData.id] = {
        ...actionData,
        fetchedAt: Date.now(),
        status: 'cached',
      };
      state.fetchStatus[actionData.id] = 'success';
      delete state.errors[actionData.id];
    },

    /**
     * Cache multiple actions at once
     */
    cacheActions: (state, action: PayloadAction<PromptAction[]>) => {
      const actions = action.payload;
      const now = Date.now();

      actions.forEach((actionData) => {
        state.actions[actionData.id] = {
          ...actionData,
          fetchedAt: now,
          status: 'cached',
        };
        state.fetchStatus[actionData.id] = 'success';
        delete state.errors[actionData.id];
      });
    },

    /**
     * Set fetch status for an action
     */
    setFetchStatus: (
      state,
      action: PayloadAction<{
        actionId: string;
        status: 'idle' | 'loading' | 'success' | 'error';
      }>
    ) => {
      const { actionId, status } = action.payload;
      state.fetchStatus[actionId] = status;

      if (status === 'loading') {
        delete state.errors[actionId];
      }
    },

    /**
     * Set error for an action fetch
     */
    setFetchError: (
      state,
      action: PayloadAction<{ actionId: string; error: string }>
    ) => {
      const { actionId, error } = action.payload;
      state.fetchStatus[actionId] = 'error';
      state.errors[actionId] = error;
    },

    /**
     * Mark an action as stale (needs refetch)
     */
    markActionStale: (state, action: PayloadAction<string>) => {
      const actionId = action.payload;
      if (state.actions[actionId]) {
        state.actions[actionId].status = 'stale';
      }
    },

    /**
     * Mark multiple actions as stale
     */
    markActionsStale: (state, action: PayloadAction<string[]>) => {
      const actionIds = action.payload;
      actionIds.forEach((actionId) => {
        if (state.actions[actionId]) {
          state.actions[actionId].status = 'stale';
        }
      });
    },

    /**
     * Remove an action from cache
     */
    removeAction: (state, action: PayloadAction<string>) => {
      const actionId = action.payload;
      delete state.actions[actionId];
      delete state.fetchStatus[actionId];
      delete state.errors[actionId];
    },

    /**
     * Remove multiple actions from cache
     */
    removeActions: (state, action: PayloadAction<string[]>) => {
      const actionIds = action.payload;
      actionIds.forEach((actionId) => {
        delete state.actions[actionId];
        delete state.fetchStatus[actionId];
        delete state.errors[actionId];
      });
    },

    /**
     * Clear entire cache
     */
    clearCache: (state) => {
      state.actions = {};
      state.fetchStatus = {};
      state.errors = {};
    },

    /**
     * Clear stale actions from cache
     */
    clearStaleActions: (state) => {
      Object.keys(state.actions).forEach((actionId) => {
        if (state.actions[actionId].status === 'stale') {
          delete state.actions[actionId];
          delete state.fetchStatus[actionId];
          delete state.errors[actionId];
        }
      });
    },

    /**
     * Update a cached action (partial update)
     */
    updateCachedAction: (
      state,
      action: PayloadAction<{ actionId: string; updates: Partial<PromptAction> }>
    ) => {
      const { actionId, updates } = action.payload;
      if (state.actions[actionId]) {
        state.actions[actionId] = {
          ...state.actions[actionId],
          ...updates,
          fetchedAt: Date.now(), // Update fetch time
        };
      }
    },
  },
});

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get a cached action by ID
 */
export const selectCachedAction = (state: RootState, actionId: string): CachedAction | null =>
  state.actionCache?.actions?.[actionId] || null;

/**
 * Check if an action is cached
 */
export const selectIsActionCached = (state: RootState, actionId: string): boolean =>
  !!state.actionCache?.actions?.[actionId];

/**
 * Get fetch status for an action
 */
export const selectActionFetchStatus = (
  state: RootState,
  actionId: string
): 'idle' | 'loading' | 'success' | 'error' =>
  state.actionCache?.fetchStatus?.[actionId] || 'idle';

/**
 * Get fetch error for an action
 */
export const selectActionFetchError = (state: RootState, actionId: string): string | null =>
  state.actionCache?.errors?.[actionId] || null;

/**
 * Check if an action is stale
 */
export const selectIsActionStale = (state: RootState, actionId: string): boolean =>
  state.actionCache?.actions?.[actionId]?.status === 'stale';

/**
 * Get all cached actions
 */
export const selectAllCachedActions = (state: RootState): CachedAction[] =>
  Object.values(state.actionCache?.actions || {});

/**
 * Get all cached actions with status 'cached' (not stale)
 */
export const selectFreshCachedActions = (state: RootState): CachedAction[] =>
  Object.values(state.actionCache?.actions || {}).filter((action) => action.status === 'cached');

/**
 * Get count of cached actions
 */
export const selectCachedActionCount = (state: RootState): number =>
  Object.keys(state.actionCache?.actions || {}).length;

/**
 * Check if action is currently loading
 */
export const selectIsActionLoading = (state: RootState, actionId: string): boolean =>
  state.actionCache?.fetchStatus?.[actionId] === 'loading';

/**
 * Get actions by tags (from cache only)
 */
export const selectCachedActionsByTag = (state: RootState, tag: string): CachedAction[] =>
  Object.values(state.actionCache?.actions || {}).filter((action) =>
    action.tags.includes(tag)
  );

/**
 * Get actions by prompt ID (from cache only)
 */
export const selectCachedActionsByPrompt = (
  state: RootState,
  promptId: string
): CachedAction[] =>
  Object.values(state.actionCache?.actions || {}).filter(
    (action) => action.prompt_id === promptId || action.prompt_builtin_id === promptId
  );

// ============================================================================
// Exports
// ============================================================================

export const {
  cacheAction,
  cacheActions,
  setFetchStatus,
  setFetchError,
  markActionStale,
  markActionsStale,
  removeAction,
  removeActions,
  clearCache,
  clearStaleActions,
  updateCachedAction,
} = actionCacheSlice.actions;

export default actionCacheSlice.reducer;

