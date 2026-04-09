/**
 * Instance Client Tools Slice
 *
 * Manages which tools the client will handle (instead of the server)
 * for each instance. When the model calls one of these tools, the server
 * emits a tool_delegated event and the client must respond within 120s.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { destroyInstance } from '../execution-instances/execution-instances.slice';

// =============================================================================
// State
// =============================================================================

export interface InstanceClientToolsState {
    byConversationId: Record<string, string[]>;
}

const initialState: InstanceClientToolsState = {
    byConversationId: {},
};

// =============================================================================
// Slice
// =============================================================================

const instanceClientToolsSlice = createSlice({
    name: 'instanceClientTools',
    initialState,
    reducers: {
        initInstanceClientTools(
            state,
            action: PayloadAction<{
                conversationId: string;
                tools?: string[];
            }>,
        ) {
            state.byConversationId[action.payload.conversationId] =
                action.payload.tools ?? [];
        },

        addClientTool(
            state,
            action: PayloadAction<{ conversationId: string; toolName: string }>,
        ) {
            const { conversationId, toolName } = action.payload;
            const tools = state.byConversationId[conversationId];
            if (tools && !tools.includes(toolName)) {
                tools.push(toolName);
            }
        },

        removeClientTool(
            state,
            action: PayloadAction<{ conversationId: string; toolName: string }>,
        ) {
            const { conversationId, toolName } = action.payload;
            const tools = state.byConversationId[conversationId];
            if (tools) {
                state.byConversationId[conversationId] = tools.filter(
                    (t) => t !== toolName,
                );
            }
        },

        setClientTools(
            state,
            action: PayloadAction<{
                conversationId: string;
                tools: string[];
            }>,
        ) {
            state.byConversationId[action.payload.conversationId] = action.payload.tools;
        },

        removeInstanceClientTools(state, action: PayloadAction<string>) {
            delete state.byConversationId[action.payload];
        },
    },

    extraReducers: (builder) => {
        builder.addCase(destroyInstance, (state, action) => {
            delete state.byConversationId[action.payload];
        });
    },
});

export const {
    initInstanceClientTools,
    addClientTool,
    removeClientTool,
    setClientTools,
    removeInstanceClientTools,
} = instanceClientToolsSlice.actions;

export default instanceClientToolsSlice.reducer;
