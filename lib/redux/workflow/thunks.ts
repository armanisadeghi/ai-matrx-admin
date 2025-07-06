import { createAsyncThunk } from "@reduxjs/toolkit";
import { Node, Edge, Viewport } from "@xyflow/react";
import { workflowService } from "./service";
import { workflowNodeService } from "../workflow-nodes/service";
import { setAll as setAllNodes, updateUiData } from "../workflow-nodes/slice";
import { updateViewport } from "./slice";
import { workflowsSelectors } from "./selectors";
import { workflowNodesSelectors } from "../workflow-nodes/selectors";
import { WorkflowCreateInput, WorkflowUpdateInput } from "./types";
import { RootState } from "../store";

export const fetchAllWorkflows = createAsyncThunk("workflows/fetchAll", async () => {
    return await workflowService.fetchAll();
});

export const fetchOneWorkflow = createAsyncThunk("workflows/fetchOne", async (id: string) => {
    return await workflowService.fetchOne(id);
});

export const createWorkflow = createAsyncThunk("workflows/create", async (workflow: WorkflowCreateInput) => {
    return await workflowService.create(workflow);
});

export const updateWorkflow = createAsyncThunk(
    "workflows/update",
    async ({ id, updates }: { id: string; updates: WorkflowUpdateInput }) => {
        return await workflowService.update(id, updates);
    }
);

export const deleteWorkflow = createAsyncThunk("workflows/delete", async (id: string) => {
    return await workflowService.delete(id);
});

export const fetchOneWorkflowWithNodes = createAsyncThunk("workflows/fetchOneWithNodes", async (id: string, { dispatch }) => {
    const workflow = await workflowService.fetchOne(id);
    const nodes = await workflowNodeService.fetchByWorkflowId(id);

    dispatch(setAllNodes(nodes));
    return workflow;
});

export const saveWorkflowWithNodes = createAsyncThunk(
    "workflows/saveWithNodes",
    async (
        {
            workflow,
            nodes,
        }: {
            workflow: { id: string; updates: WorkflowUpdateInput };
            nodes: { create: any[]; update: any[]; delete: string[] };
        },
        { dispatch }
    ) => {
        try {
            // Start transaction-like operations
            const updatedWorkflow = await workflowService.update(workflow.id, workflow.updates);

            // Handle node operations
            const promises = [];

            // Create new nodes
            if (nodes.create.length > 0) {
                promises.push(...nodes.create.map((node) => workflowNodeService.create({ ...node, workflow_id: workflow.id })));
            }

            // Update existing nodes
            if (nodes.update.length > 0) {
                promises.push(...nodes.update.map((node) => workflowNodeService.update(node.id, node)));
            }

            // Delete nodes
            if (nodes.delete.length > 0) {
                promises.push(...nodes.delete.map((nodeId) => workflowNodeService.delete(nodeId)));
            }

            await Promise.all(promises);

            // Refresh nodes data
            const refreshedNodes = await workflowNodeService.fetchByWorkflowId(workflow.id);
            dispatch(setAllNodes(refreshedNodes));

            return updatedWorkflow;
        } catch (error) {
            console.error("Error saving workflow with nodes:", error);
            throw error;
        }
    }
);

export const saveWorkflowFromReactFlow = createAsyncThunk(
    "workflows/saveFromReactFlow",
    async (
        {
            workflowId,
            reactFlowNodes,
            reactFlowEdges,
            reactFlowViewport,
        }: {
            workflowId: string;
            reactFlowNodes: Node[];
            reactFlowEdges: Edge[];
            reactFlowViewport: Viewport;
        },
        { getState, dispatch }
    ) => {
        // 1. Update workflow viewport in state
        dispatch(
            updateViewport({
                id: workflowId,
                viewport: reactFlowViewport,
            })
        );

        // 2. Get current workflow nodes from Redux
        const state = getState() as RootState;
        const workflowNodes = workflowNodesSelectors.nodesByWorkflowId(state, workflowId);

        // 3. Update ui_data for each workflow node with matching ReactFlow node
        workflowNodes.forEach((workflowNode) => {
            const reactFlowNode = reactFlowNodes.find((rfNode) => rfNode.id === workflowNode.id);

            if (!reactFlowNode) {
                throw new Error(`ReactFlow node not found for WorkflowNode ID: ${workflowNode.id}`);
            }

            const { id, data, ...uiData } = reactFlowNode;

            dispatch(
                updateUiData({
                    id: workflowNode.id,
                    ui_data: uiData,
                })
            );
        });

        // 4. Get updated state and save everything
        const updatedState = getState() as RootState;
        const updatedWorkflow = workflowsSelectors.workflowById(updatedState, workflowId);
        const updatedWorkflowNodes = workflowNodesSelectors.nodesByWorkflowId(updatedState, workflowId);

        if (!updatedWorkflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }

        // 5. Save to database
        return await dispatch(
            saveWorkflowWithNodes({
                workflow: { id: workflowId, updates: updatedWorkflow },
                nodes: {
                    create: [],
                    update: updatedWorkflowNodes,
                    delete: [],
                },
            })
        ).unwrap();
    }
);
