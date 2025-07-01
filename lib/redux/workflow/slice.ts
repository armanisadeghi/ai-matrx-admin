import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    WorkflowData,
    WorkflowSliceState,
    InputMapping,
    Output,
    Dependency,
    BrokerSourceConfig,
    BrokerDestination,
    createInputMapping,
    createOutput,
    createDependency,
    ensureInputMappingArray,
    ensureOutputArray,
    ensureDependencyArray,
} from "./types";
import { fetchOne, fetchAll, create, update, deleteWorkflow, fetchOneWithNodes, saveWithNodes, fetchOrGetFromState } from "./thunks";

const initialState: WorkflowSliceState = {
    workflows: {},
    selectedWorkflowId: null,
    loading: false,
    error: null,
    dirtyWorkflows: [],
    lastFetched: {},
    staleTime: 600000, // 10 minutes
};

const workflowSlice = createSlice({
    name: "workflow",
    initialState,
    reducers: {
        // Workflow selection
        selectWorkflow: (state, action: PayloadAction<string | null>) => {
            state.selectedWorkflowId = action.payload;
        },

        // Mark workflow as dirty/clean
        markWorkflowDirty: (state, action: PayloadAction<string>) => {
            if (!state.dirtyWorkflows.includes(action.payload)) {
                state.dirtyWorkflows.push(action.payload);
            }
        },
        markWorkflowClean: (state, action: PayloadAction<string>) => {
            state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== action.payload);
        },
        markAllWorkflowsClean: (state) => {
            state.dirtyWorkflows = [];
        },

        // Update specific workflow fields
        updateWorkflowField: (state, action: PayloadAction<{ workflowId: string; field: keyof WorkflowData; value: any }>) => {
            const { workflowId, field, value } = action.payload;
            if (state.workflows[workflowId]) {
                (state.workflows[workflowId] as any)[field] = value;
                if (!state.dirtyWorkflows.includes(workflowId)) {
                    state.dirtyWorkflows.push(workflowId);
                }
            }
        },

        // Update entire workflow
        updateWorkflow: (state, action: PayloadAction<{ workflowId: string; updates: Partial<WorkflowData> }>) => {
            const { workflowId, updates } = action.payload;
            if (state.workflows[workflowId]) {
                state.workflows[workflowId] = { ...state.workflows[workflowId], ...updates };
                if (!state.dirtyWorkflows.includes(workflowId)) {
                    state.dirtyWorkflows.push(workflowId);
                }
            }
        },

        // Individual field updates for selected workflow (backward compatibility)
        updateName: (state, action: PayloadAction<string>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].name = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateDescription: (state, action: PayloadAction<string | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].description = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateWorkflowType: (state, action: PayloadAction<string | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].workflow_type = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateInputs: (state, action: PayloadAction<InputMapping[] | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].inputs = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateOutputs: (state, action: PayloadAction<Output[] | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].outputs = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateDependencies: (state, action: PayloadAction<Dependency[] | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].dependencies = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateSources: (state, action: PayloadAction<BrokerSourceConfig[] | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].sources = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        addSource: (state, action: PayloadAction<BrokerSourceConfig>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].sources = [
                    ...(state.workflows[state.selectedWorkflowId].sources || []),
                    action.payload,
                ];
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        removeSource: (state, action: PayloadAction<{ sourceType: string; brokerId: string }>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].sources = state.workflows[state.selectedWorkflowId].sources?.filter(
                    (source) => `${source.sourceType}:${source.brokerId}` !== `${action.payload.sourceType}:${action.payload.brokerId}`
                );
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateSource: (state, action: PayloadAction<{ sourceType: string; brokerId: string; source: BrokerSourceConfig }>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.sources) {
                    const index = workflow.sources.findIndex(
                        (source) => `${source.sourceType}:${source.brokerId}` === `${action.payload.sourceType}:${action.payload.brokerId}`
                    );
                    if (index !== -1) {
                        workflow.sources[index] = action.payload.source;
                    }
                }
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateDestinations: (state, action: PayloadAction<BrokerDestination[] | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].destinations = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        addDestination: (state, action: PayloadAction<BrokerDestination>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].destinations = [
                    ...(state.workflows[state.selectedWorkflowId].destinations || []),
                    action.payload,
                ];
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },

        removeDestination: (state, action: PayloadAction<string>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].destinations = state.workflows[state.selectedWorkflowId].destinations?.filter(
                    (destination) => destination.broker_id !== action.payload
                );
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },

        updateActions: (state, action: PayloadAction<any>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].actions = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateCategory: (state, action: PayloadAction<string | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].category = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateTags: (state, action: PayloadAction<any>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].tags = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateIsActive: (state, action: PayloadAction<boolean | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].is_active = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateIsDeleted: (state, action: PayloadAction<boolean | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].is_deleted = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateAutoExecute: (state, action: PayloadAction<boolean | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].auto_execute = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateMetadata: (state, action: PayloadAction<Record<string, any> | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].metadata = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateViewport: (state, action: PayloadAction<any>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].viewport = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateIsPublic: (state, action: PayloadAction<boolean | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].is_public = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateAuthenticatedRead: (state, action: PayloadAction<boolean | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].authenticated_read = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updatePublicRead: (state, action: PayloadAction<boolean | null>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                state.workflows[state.selectedWorkflowId].public_read = action.payload;
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },

        // Array management for selected workflow
        addInput: (state, action: PayloadAction<InputMapping>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (!workflow.inputs) workflow.inputs = [];
                workflow.inputs.push(action.payload);
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateInput: (state, action: PayloadAction<{ index: number; input: InputMapping }>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.inputs && workflow.inputs[action.payload.index]) {
                    workflow.inputs[action.payload.index] = action.payload.input;
                    if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                        state.dirtyWorkflows.push(state.selectedWorkflowId);
                    }
                }
            }
        },
        removeInput: (state, action: PayloadAction<number>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.inputs) {
                    workflow.inputs.splice(action.payload, 1);
                    if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                        state.dirtyWorkflows.push(state.selectedWorkflowId);
                    }
                }
            }
        },
        addOutput: (state, action: PayloadAction<Output>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (!workflow.outputs) workflow.outputs = [];
                workflow.outputs.push(action.payload);
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateOutput: (state, action: PayloadAction<{ index: number; output: Output }>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.outputs && workflow.outputs[action.payload.index]) {
                    workflow.outputs[action.payload.index] = action.payload.output;
                    if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                        state.dirtyWorkflows.push(state.selectedWorkflowId);
                    }
                }
            }
        },
        removeOutput: (state, action: PayloadAction<number>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.outputs) {
                    workflow.outputs.splice(action.payload, 1);
                    if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                        state.dirtyWorkflows.push(state.selectedWorkflowId);
                    }
                }
            }
        },
        addDependency: (state, action: PayloadAction<Dependency>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (!workflow.dependencies) workflow.dependencies = [];
                workflow.dependencies.push(action.payload);
                if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                    state.dirtyWorkflows.push(state.selectedWorkflowId);
                }
            }
        },
        updateDependency: (state, action: PayloadAction<{ index: number; dependency: Dependency }>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.dependencies && workflow.dependencies[action.payload.index]) {
                    workflow.dependencies[action.payload.index] = action.payload.dependency;
                    if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                        state.dirtyWorkflows.push(state.selectedWorkflowId);
                    }
                }
            }
        },
        removeDependency: (state, action: PayloadAction<number>) => {
            if (state.selectedWorkflowId && state.workflows[state.selectedWorkflowId]) {
                const workflow = state.workflows[state.selectedWorkflowId];
                if (workflow.dependencies) {
                    workflow.dependencies.splice(action.payload, 1);
                    if (!state.dirtyWorkflows.includes(state.selectedWorkflowId)) {
                        state.dirtyWorkflows.push(state.selectedWorkflowId);
                    }
                }
            }
        },

        // Cache management
        markWorkflowStale: (state, action: PayloadAction<string>) => {
            delete state.lastFetched[action.payload];
        },

        // Remove workflow from state
        removeWorkflowFromState: (state, action: PayloadAction<string>) => {
            delete state.workflows[action.payload];
            delete state.lastFetched[action.payload];
            state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== action.payload);
            if (state.selectedWorkflowId === action.payload) {
                state.selectedWorkflowId = null;
            }
        },

        // Set multiple workflows (from fetch operations)
        setWorkflows: (state, action: PayloadAction<WorkflowData[]>) => {
            action.payload.forEach((workflow) => {
                state.workflows[workflow.id] = workflow;
                state.lastFetched[workflow.id] = Date.now();
            });
        },

        // Set single workflow (from fetch operations)
        setWorkflow: (state, action: PayloadAction<WorkflowData>) => {
            const workflow = action.payload;
            state.workflows[workflow.id] = workflow;
            state.lastFetched[workflow.id] = Date.now();
            state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id); // Clean after successful fetch/save
        },

        // Backward compatibility - set all workflow data (used by thunks)
        setAll: (state, action: PayloadAction<Partial<WorkflowData>>) => {
            if (action.payload.id) {
                state.workflows[action.payload.id] = { ...state.workflows[action.payload.id], ...action.payload } as WorkflowData;
                state.lastFetched[action.payload.id] = Date.now();
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== action.payload.id);
            }
        },

        // Reset entire state
        reset: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // fetchOne
            .addCase(fetchOne.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOne.fulfilled, (state, action) => {
                state.loading = false;
                const workflow = action.payload;
                state.workflows[workflow.id] = workflow;
                state.lastFetched[workflow.id] = Date.now();
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id);
            })
            .addCase(fetchOne.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch workflow";
            })
            // fetchAll
            .addCase(fetchAll.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAll.fulfilled, (state, action) => {
                state.loading = false;
                action.payload.forEach((workflow) => {
                    state.workflows[workflow.id] = workflow;
                    state.lastFetched[workflow.id] = Date.now();
                });
            })
            .addCase(fetchAll.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch workflows";
            })
            // create
            .addCase(create.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(create.fulfilled, (state, action) => {
                state.loading = false;
                const workflow = action.payload;
                state.workflows[workflow.id] = workflow;
                state.lastFetched[workflow.id] = Date.now();
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id);
            })
            .addCase(create.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to create workflow";
            })
            // update
            .addCase(update.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(update.fulfilled, (state, action) => {
                state.loading = false;
                const workflow = action.payload;
                state.workflows[workflow.id] = workflow;
                state.lastFetched[workflow.id] = Date.now();
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id);
            })
            .addCase(update.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to update workflow";
            })
            // delete
            .addCase(deleteWorkflow.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteWorkflow.fulfilled, (state, action) => {
                state.loading = false;
                const workflowId = action.payload;
                delete state.workflows[workflowId];
                delete state.lastFetched[workflowId];
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflowId);
                if (state.selectedWorkflowId === workflowId) {
                    state.selectedWorkflowId = null;
                }
            })
            .addCase(deleteWorkflow.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to delete workflow";
            })
            // fetchOneWithNodes
            .addCase(fetchOneWithNodes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOneWithNodes.fulfilled, (state, action) => {
                state.loading = false;
                const workflow = action.payload;
                state.workflows[workflow.id] = workflow;
                state.lastFetched[workflow.id] = Date.now();
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id);
            })
            .addCase(fetchOneWithNodes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch workflow with nodes";
            })
            // saveWithNodes
            .addCase(saveWithNodes.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(saveWithNodes.fulfilled, (state, action) => {
                state.loading = false;
                const workflow = action.payload;
                state.workflows[workflow.id] = workflow;
                state.lastFetched[workflow.id] = Date.now();
                state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id);
            })
            .addCase(saveWithNodes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to save workflow with nodes";
            })
            // fetchOrGetFromState
            .addCase(fetchOrGetFromState.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrGetFromState.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    const workflow = action.payload;
                    state.workflows[workflow.id] = workflow;
                    state.lastFetched[workflow.id] = Date.now();
                    state.dirtyWorkflows = state.dirtyWorkflows.filter((id) => id !== workflow.id);
                }
            })
            .addCase(fetchOrGetFromState.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch or get workflow from state";
            });
    },
});

export const workflowActions = workflowSlice.actions;

// Export utility functions for easy access
export const workflowUtils = {
    createInputMapping,
    createOutput,
    createDependency,
    ensureInputMappingArray,
    ensureOutputArray,
    ensureDependencyArray,
};

export default workflowSlice.reducer;
