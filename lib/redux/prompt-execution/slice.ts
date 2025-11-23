/**
 * Prompt Execution Slice
 * 
 * Central Redux slice managing ALL prompt execution instances.
 * Eliminates closure bugs and provides single source of truth for:
 * - Variable management
 * - Execution state
 * - Conversation history
 * - Run tracking
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type {
  PromptExecutionState,
  ExecutionInstance,
  ExecutionStatus,
  ConversationMessage,
  UpdateVariablePayload,
  SetCurrentInputPayload,
} from './types';

const initialState: PromptExecutionState = {
  instances: {},
  runsByPromptId: {},
  scopedVariables: {
    user: null,
    org: null,
    project: null,
    fetchedAt: null,
    status: 'idle',
  },
};

const promptExecutionSlice = createSlice({
  name: 'promptExecution',
  initialState,
  reducers: {
    // ========== INSTANCE MANAGEMENT ==========
    
    /**
     * Create a new execution instance (run)
     */
    createInstance: (state, action: PayloadAction<ExecutionInstance>) => {
      const instance = action.payload;
      state.instances[instance.runId] = instance;
      
      // Update lookup maps
      if (!state.runsByPromptId[instance.promptId]) {
        state.runsByPromptId[instance.promptId] = [];
      }
      state.runsByPromptId[instance.promptId].push(instance.runId);
    },
    
    /**
     * Remove an instance (cleanup)
     */
    removeInstance: (state, action: PayloadAction<{ runId: string }>) => {
      const { runId } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        // Remove from lookup maps
        const promptRuns = state.runsByPromptId[instance.promptId];
        if (promptRuns) {
          state.runsByPromptId[instance.promptId] = 
            promptRuns.filter(id => id !== runId);
        }
        
        // Remove instance
        delete state.instances[runId];
      }
    },
    
    /**
     * Update instance status
     */
    setInstanceStatus: (
      state,
      action: PayloadAction<{ runId: string; status: ExecutionStatus; error?: string }>
    ) => {
      const { runId, status, error } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.status = status;
        instance.error = error || null;
        instance.updatedAt = Date.now();
      }
    },
    
    // ========== VARIABLE MANAGEMENT ==========
    
    /**
     * Update a single variable value
     */
    updateVariable: (state, action: PayloadAction<UpdateVariablePayload>) => {
      const { runId, variableName, value } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.variables.userValues[variableName] = value;
        instance.updatedAt = Date.now();
      }
    },
    
    /**
     * Update multiple variables at once
     */
    updateVariables: (
      state,
      action: PayloadAction<{ runId: string; variables: Record<string, string> }>
    ) => {
      const { runId, variables } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.variables.userValues = {
          ...instance.variables.userValues,
          ...variables,
        };
        instance.updatedAt = Date.now();
      }
    },
    
    /**
     * Set computed variables (runtime values)
     */
    setComputedVariables: (
      state,
      action: PayloadAction<{ runId: string; variables: Record<string, string> }>
    ) => {
      const { runId, variables } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.variables.computedValues = variables;
        instance.updatedAt = Date.now();
      }
    },
    
    // ========== CONVERSATION MANAGEMENT ==========
    
    /**
     * Set current input (user typing)
     */
    setCurrentInput: (state, action: PayloadAction<SetCurrentInputPayload>) => {
      const { runId, input } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.conversation.currentInput = input;
      }
    },
    
    /**
     * Add a message to conversation
     */
    addMessage: (
      state,
      action: PayloadAction<{ runId: string; message: ConversationMessage }>
    ) => {
      const { runId, message } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.conversation.messages.push(message);
        instance.updatedAt = Date.now();
      }
    },
    
    /**
     * Clear conversation (reset)
     */
    clearConversation: (state, action: PayloadAction<{ runId: string }>) => {
      const { runId } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.conversation.messages = [];
        instance.conversation.currentInput = '';
        instance.runTracking.runName = null;
        instance.runTracking.savedToDatabase = false;
        instance.updatedAt = Date.now();
      }
    },
    
    // ========== EXECUTION TRACKING ==========
    
    /**
     * Start execution (set taskId and start time)
     */
    startExecution: (
      state,
      action: PayloadAction<{ runId: string; taskId: string }>
    ) => {
      const { runId, taskId } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.execution.currentTaskId = taskId;
        instance.execution.messageStartTime = Date.now();
        instance.execution.timeToFirstToken = undefined;
        instance.status = 'executing';
        instance.updatedAt = Date.now();
      }
    },
    
    /**
     * Mark streaming started
     */
    startStreaming: (state, action: PayloadAction<{ runId: string }>) => {
      const { runId } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.status = 'streaming';
        
        // Record time to first token if not set
        if (
          instance.execution.messageStartTime &&
          instance.execution.timeToFirstToken === undefined
        ) {
          instance.execution.timeToFirstToken = 
            Date.now() - instance.execution.messageStartTime;
        }
      }
    },
    
    /**
     * Complete execution (store final stats)
     */
    completeExecution: (
      state,
      action: PayloadAction<{
        runId: string;
        stats: {
          timeToFirstToken?: number;
          totalTime?: number;
          tokens?: number;
          cost?: number;
        };
      }>
    ) => {
      const { runId, stats } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.execution.lastMessageStats = stats;
        instance.execution.currentTaskId = null;
        instance.execution.messageStartTime = null;
        instance.status = 'completed';
        instance.updatedAt = Date.now();
        
        // Update run totals
        if (stats.tokens) {
          instance.runTracking.totalTokens += stats.tokens;
        }
        if (stats.cost) {
          instance.runTracking.totalCost += stats.cost;
        }
      }
    },
    
    // ========== RUN TRACKING ==========
    
    /**
     * Set run ID (when run created in DB)
     */
    setRunId: (
      state,
      action: PayloadAction<{ runId: string; runName: string; savedToDatabase: boolean }>
    ) => {
      const { runId, runName, savedToDatabase } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.runTracking.runName = runName;
        instance.runTracking.savedToDatabase = savedToDatabase;
        instance.updatedAt = Date.now();
      }
    },
    
    // ========== SCOPED VARIABLES ==========
    
    /**
     * Set scoped variables status
     */
    setScopedVariablesStatus: (
      state,
      action: PayloadAction<'idle' | 'loading' | 'loaded' | 'error'>
    ) => {
      state.scopedVariables.status = action.payload;
    },
    
    /**
     * Set scoped variables (from DB)
     */
    setScopedVariables: (
      state,
      action: PayloadAction<{
        user?: Record<string, string>;
        org?: Record<string, string>;
        project?: Record<string, string>;
      }>
    ) => {
      const { user, org, project } = action.payload;
      
      if (user) state.scopedVariables.user = user;
      if (org) state.scopedVariables.org = org;
      if (project) state.scopedVariables.project = project;
      
      state.scopedVariables.fetchedAt = Date.now();
      state.scopedVariables.status = 'loaded';
    },
    
    /**
     * Clear scoped variables (logout)
     */
    clearScopedVariables: (state) => {
      state.scopedVariables = {
        user: null,
        org: null,
        project: null,
        fetchedAt: null,
        status: 'idle',
      };
    },
    
    // ========== UI STATE ==========
    
    /**
     * Set expanded variable
     */
    setExpandedVariable: (
      state,
      action: PayloadAction<{ runId: string; variableName: string | null }>
    ) => {
      const { runId, variableName } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.ui.expandedVariable = variableName;
      }
    },
    
    /**
     * Toggle show variables
     */
    toggleShowVariables: (state, action: PayloadAction<{ runId: string }>) => {
      const { runId } = action.payload;
      const instance = state.instances[runId];
      
      if (instance) {
        instance.ui.showVariables = !instance.ui.showVariables;
      }
    },
  },
});

// ========== ACTIONS ==========
export const {
  createInstance,
  removeInstance,
  setInstanceStatus,
  updateVariable,
  updateVariables,
  setComputedVariables,
  setCurrentInput,
  addMessage,
  clearConversation,
  startExecution,
  startStreaming,
  completeExecution,
  setRunId,
  setScopedVariablesStatus,
  setScopedVariables,
  clearScopedVariables,
  setExpandedVariable,
  toggleShowVariables,
} = promptExecutionSlice.actions;

// ========== BASIC SELECTORS ==========

export const selectInstance = (state: RootState, runId: string) =>
  state.promptExecution?.instances[runId];

export const selectAllInstances = (state: RootState) =>
  state.promptExecution?.instances || {};

export const selectInstancesByPromptId = (state: RootState, promptId: string) => {
  const runIds = state.promptExecution?.runsByPromptId[promptId] || [];
  return runIds.map(id => state.promptExecution.instances[id]).filter(Boolean);
};

export const selectInstanceByRunId = (state: RootState, runId: string) => {
  return state.promptExecution?.instances[runId] || null;
};

export const selectScopedVariables = (state: RootState) =>
  state.promptExecution?.scopedVariables;

export default promptExecutionSlice.reducer;

