import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WorkflowNodeData, WorkflowNodeSliceState } from "./types";
import { InputMapping, Output, Dependency } from "../workflow/types";
import { fetchOne, fetchAll, fetchByWorkflowId, create, update, deleteNode, duplicateNode, fetchOrGetFromState, saveStateToDb } from "./thunks";

const initialState: WorkflowNodeSliceState = {
    nodes: {},
    selectedNodeId: null,
    loading: false,
    error: null,
    dirtyNodes: [],
    lastFetched: {},
    staleTime: 600000, // 10 minutes
};

const workflowNodeSlice = createSlice({
    name: "workflowNode",
    initialState,
    reducers: {
        // Node selection
        selectNode: (state, action: PayloadAction<string | null>) => {
            state.selectedNodeId = action.payload;
        },

        // Individual field updates
        updateStepName: (state, action: PayloadAction<{ nodeId: string; stepName: string | null }>) => {
            const { nodeId, stepName } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].step_name = stepName;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateWorkflowId: (state, action: PayloadAction<{ nodeId: string; workflowId: string | null }>) => {
            const { nodeId, workflowId } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].workflow_id = workflowId;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateFunctionId: (state, action: PayloadAction<{ nodeId: string; functionId: string | null }>) => {
            const { nodeId, functionId } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].function_id = functionId;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateType: (state, action: PayloadAction<{ nodeId: string; type: string | null }>) => {
            const { nodeId, type } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].type = type;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateNodeType: (state, action: PayloadAction<{ nodeId: string; nodeType: string | null }>) => {
            const { nodeId, nodeType } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].node_type = nodeType;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateExecutionRequired: (state, action: PayloadAction<{ nodeId: string; executionRequired: boolean | null }>) => {
            const { nodeId, executionRequired } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].execution_required = executionRequired;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateIsPublic: (state, action: PayloadAction<{ nodeId: string; isPublic: boolean | null }>) => {
            const { nodeId, isPublic } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].is_public = isPublic;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateAuthenticatedRead: (state, action: PayloadAction<{ nodeId: string; authenticatedRead: boolean | null }>) => {
            const { nodeId, authenticatedRead } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].authenticated_read = authenticatedRead;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updatePublicRead: (state, action: PayloadAction<{ nodeId: string; publicRead: boolean | null }>) => {
            const { nodeId, publicRead } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].public_read = publicRead;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateUserId: (state, action: PayloadAction<{ nodeId: string; userId: string | null }>) => {
            const { nodeId, userId } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].user_id = userId;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Mark node as dirty/clean
        markNodeDirty: (state, action: PayloadAction<string>) => {
            if (!state.dirtyNodes.includes(action.payload)) {
                state.dirtyNodes.push(action.payload);
            }
        },
        markNodeClean: (state, action: PayloadAction<string>) => {
            state.dirtyNodes = state.dirtyNodes.filter(id => id !== action.payload);
        },
        markAllNodesClean: (state) => {
            state.dirtyNodes = [];
        },

        // Update specific node fields
        updateNodeField: (state, action: PayloadAction<{ nodeId: string; field: keyof WorkflowNodeData; value: any }>) => {
            const { nodeId, field, value } = action.payload;
            if (state.nodes[nodeId]) {
                (state.nodes[nodeId] as any)[field] = value;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Update entire node
        updateNode: (state, action: PayloadAction<{ nodeId: string; updates: Partial<WorkflowNodeData> }>) => {
            const { nodeId, updates } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId] = { ...state.nodes[nodeId], ...updates };
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Input management
        updateNodeInputs: (state, action: PayloadAction<{ nodeId: string; inputs: InputMapping[] | null }>) => {
            const { nodeId, inputs } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].inputs = inputs;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        updateNodeInputByArgName: (state, action: PayloadAction<{ nodeId: string; argName: string; updates: Partial<InputMapping> }>) => {
            const { nodeId, argName, updates } = action.payload;
            const node = state.nodes[nodeId];
            if (node && node.inputs) {
                const input = node.inputs.find((input) => input.arg_name === argName);
                if (input) {
                    Object.assign(input, updates);
                    if (!state.dirtyNodes.includes(nodeId)) {
                        state.dirtyNodes.push(nodeId);
                    }
                }
            }
        },

        addNodeInput: (state, action: PayloadAction<{ nodeId: string; input: InputMapping }>) => {
            const { nodeId, input } = action.payload;
            const node = state.nodes[nodeId];
            if (node) {
                if (!node.inputs) node.inputs = [];
                node.inputs.push(input);
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        addNodeInputs: (state, action: PayloadAction<{ nodeId: string; inputs: InputMapping[] }>) => {
          const { nodeId, inputs } = action.payload;
          const node = state.nodes[nodeId];
          if (node) {
              if (!node.inputs) node.inputs = [];
              node.inputs.push(...inputs);
              if (!state.dirtyNodes.includes(nodeId)) {
                  state.dirtyNodes.push(nodeId);
              }
          }
        },


        removeNodeInput: (state, action: PayloadAction<{ nodeId: string; index: number }>) => {
            const { nodeId, index } = action.payload;
            const node = state.nodes[nodeId];
            if (node && node.inputs) {
                node.inputs.splice(index, 1);
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Output management
        updateNodeOutputs: (state, action: PayloadAction<{ nodeId: string; outputs: Output[] | null }>) => {
            const { nodeId, outputs } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].outputs = outputs;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        addNodeOutput: (state, action: PayloadAction<{ nodeId: string; output: Output }>) => {
            const { nodeId, output } = action.payload;
            const node = state.nodes[nodeId];
            if (node) {
                if (!node.outputs) node.outputs = [];
                node.outputs.push(output);
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        removeNodeOutput: (state, action: PayloadAction<{ nodeId: string; index: number }>) => {
            const { nodeId, index } = action.payload;
            const node = state.nodes[nodeId];
            if (node && node.outputs) {
                node.outputs.splice(index, 1);
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Dependency management
        updateNodeDependencies: (state, action: PayloadAction<{ nodeId: string; dependencies: Dependency[] | null }>) => {
            const { nodeId, dependencies } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].dependencies = dependencies;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        addNodeDependency: (state, action: PayloadAction<{ nodeId: string; dependency: Dependency }>) => {
            const { nodeId, dependency } = action.payload;
            const node = state.nodes[nodeId];
            if (node) {
                if (!node.dependencies) node.dependencies = [];
                node.dependencies.push(dependency);
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        removeNodeDependency: (state, action: PayloadAction<{ nodeId: string; index: number }>) => {
            const { nodeId, index } = action.payload;
            const node = state.nodes[nodeId];
            if (node && node.dependencies) {
                node.dependencies.splice(index, 1);
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        clearNodeDependencies: (state, action: PayloadAction<{ nodeId: string }>) => {
            const { nodeId } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].dependencies = [];
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // UI Data management
        updateNodeUiData: (state, action: PayloadAction<{ nodeId: string; uiData: any }>) => {
            const { nodeId, uiData } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].ui_data = uiData;
                // UI data changes might not need to mark as dirty for saving
            }
        },

        // Metadata management
        updateNodeMetadata: (state, action: PayloadAction<{ nodeId: string; metadata: Record<string, any> | null }>) => {
            const { nodeId, metadata } = action.payload;
            if (state.nodes[nodeId]) {
                state.nodes[nodeId].metadata = metadata;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Set node active status
        setNodeActive: (state, action: PayloadAction<{ nodeId: string; active: boolean }>) => {
            const { nodeId, active } = action.payload;
            if (state.nodes[nodeId]) {
                // Initialize metadata if it doesn't exist
                if (!state.nodes[nodeId].metadata) {
                    state.nodes[nodeId].metadata = {};
                }
                // Set or update the active status
                state.nodes[nodeId].metadata!.active = active;
                if (!state.dirtyNodes.includes(nodeId)) {
                    state.dirtyNodes.push(nodeId);
                }
            }
        },

        // Cache management
        markNodeStale: (state, action: PayloadAction<string>) => {
            delete state.lastFetched[action.payload];
        },

        // Remove node from state
        removeNodeFromState: (state, action: PayloadAction<string>) => {
            delete state.nodes[action.payload];
            delete state.lastFetched[action.payload];
            state.dirtyNodes = state.dirtyNodes.filter(id => id !== action.payload);
            if (state.selectedNodeId === action.payload) {
                state.selectedNodeId = null;
            }
        },

        // Set multiple nodes (from fetch operations)
        setNodes: (state, action: PayloadAction<WorkflowNodeData[]>) => {
            action.payload.forEach(node => {
                state.nodes[node.id] = node;
                state.lastFetched[node.id] = Date.now();
            });
        },

        // Set single node (from fetch operations)
        setNode: (state, action: PayloadAction<WorkflowNodeData>) => {
            const node = action.payload;
            state.nodes[node.id] = node;
            state.lastFetched[node.id] = Date.now();
            state.dirtyNodes = state.dirtyNodes.filter(id => id !== node.id); // Clean after successful fetch/save
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
                const node = action.payload;
                state.nodes[node.id] = node;
                state.lastFetched[node.id] = Date.now();
                state.dirtyNodes = state.dirtyNodes.filter(id => id !== node.id);
            })
            .addCase(fetchOne.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch workflow node";
            })
            // fetchAll
            .addCase(fetchAll.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAll.fulfilled, (state, action) => {
                state.loading = false;
                action.payload.forEach(node => {
                    state.nodes[node.id] = node;
                    state.lastFetched[node.id] = Date.now();
                });
            })
            .addCase(fetchAll.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch workflow nodes";
            })
            // fetchByWorkflowId
            .addCase(fetchByWorkflowId.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchByWorkflowId.fulfilled, (state, action) => {
                state.loading = false;
                action.payload.forEach(node => {
                    state.nodes[node.id] = node;
                    state.lastFetched[node.id] = Date.now();
                });
            })
            .addCase(fetchByWorkflowId.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch workflow nodes";
            })
            // create
            .addCase(create.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(create.fulfilled, (state, action) => {
                state.loading = false;
                const node = action.payload;
                state.nodes[node.id] = node;
                state.lastFetched[node.id] = Date.now();
                state.dirtyNodes = state.dirtyNodes.filter(id => id !== node.id);
            })
            .addCase(create.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to create workflow node";
            })
            // update
            .addCase(update.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(update.fulfilled, (state, action) => {
                state.loading = false;
                const node = action.payload;
                state.nodes[node.id] = node;
                state.lastFetched[node.id] = Date.now();
                state.dirtyNodes = state.dirtyNodes.filter(id => id !== node.id);
            })
            .addCase(update.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to update workflow node";
            })
            // delete
            .addCase(deleteNode.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteNode.fulfilled, (state, action) => {
                state.loading = false;
                const nodeId = action.payload;
                delete state.nodes[nodeId];
                delete state.lastFetched[nodeId];
                state.dirtyNodes = state.dirtyNodes.filter(id => id !== nodeId);
                if (state.selectedNodeId === nodeId) {
                    state.selectedNodeId = null;
                }
            })
            .addCase(deleteNode.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to delete workflow node";
            })
            // duplicateNode
            .addCase(duplicateNode.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(duplicateNode.fulfilled, (state, action) => {
                state.loading = false;
                const node = action.payload;
                state.nodes[node.id] = node;
                state.lastFetched[node.id] = Date.now();
            })
            .addCase(duplicateNode.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to duplicate workflow node";
            })
            // fetchOrGetFromState
            .addCase(fetchOrGetFromState.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrGetFromState.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    const node = action.payload;
                    state.nodes[node.id] = node;
                    state.lastFetched[node.id] = Date.now();
                    state.dirtyNodes = state.dirtyNodes.filter(id => id !== node.id);
                }
            })
            .addCase(fetchOrGetFromState.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch or get workflow node from state";
            })
            // saveStateToDb
            .addCase(saveStateToDb.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(saveStateToDb.fulfilled, (state, action) => {
                state.loading = false;
                const node = action.payload;
                state.nodes[node.id] = node;
                state.lastFetched[node.id] = Date.now();
                state.dirtyNodes = state.dirtyNodes.filter(id => id !== node.id);
            })
            .addCase(saveStateToDb.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to save node state to database";
            });
    },
});

export const workflowNodeActions = workflowNodeSlice.actions;
export default workflowNodeSlice.reducer;
