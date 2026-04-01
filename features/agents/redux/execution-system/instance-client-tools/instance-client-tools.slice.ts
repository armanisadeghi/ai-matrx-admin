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
    byInstanceId: Record<string, string[]>;
}

const initialState: InstanceClientToolsState = {
    byInstanceId: {},
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
                instanceId: string;
                tools?: string[];
            }>,
        ) {
            state.byInstanceId[action.payload.instanceId] =
                action.payload.tools ?? [];
        },

        addClientTool(
            state,
            action: PayloadAction<{ instanceId: string; toolName: string }>,
        ) {
            const { instanceId, toolName } = action.payload;
            const tools = state.byInstanceId[instanceId];
            if (tools && !tools.includes(toolName)) {
                tools.push(toolName);
            }
        },

        removeClientTool(
            state,
            action: PayloadAction<{ instanceId: string; toolName: string }>,
        ) {
            const { instanceId, toolName } = action.payload;
            const tools = state.byInstanceId[instanceId];
            if (tools) {
                state.byInstanceId[instanceId] = tools.filter(
                    (t) => t !== toolName,
                );
            }
        },

        setClientTools(
            state,
            action: PayloadAction<{
                instanceId: string;
                tools: string[];
            }>,
        ) {
            state.byInstanceId[action.payload.instanceId] = action.payload.tools;
        },

        removeInstanceClientTools(state, action: PayloadAction<string>) {
            delete state.byInstanceId[action.payload];
        },
    },

    extraReducers: (builder) => {
        builder.addCase(destroyInstance, (state, action) => {
            delete state.byInstanceId[action.payload];
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
