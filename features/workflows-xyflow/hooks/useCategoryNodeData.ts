import { useMemo, useState } from "react";
import { getIconComponent } from "@/components/common/IconResolver";
import { useNodeCategoryWithFetch, useRegisteredNodeWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { WorkflowNode, WorkflowNodeUiData } from "@/lib/redux/workflow-nodes/types";
import { createWorkflowNode } from "@/lib/redux/workflow-nodes/thunks";
import { RegisteredNodeData } from "@/types/AutomationSchemaTypes";

export interface CategoryNodeData {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}

const RECIPE_FUNCTION_ID = "2ac5576b-d1ab-45b1-ab48-4e196629fdd8";

export function newNodeFunction(
    nodeDefinition: RegisteredNodeData,
    workflowId: string,
    userId: string,
    categoryName: string,
    uiData?: WorkflowNodeUiData
): Omit<WorkflowNode, "id" | "created_at" | "updated_at"> {
    const randomXOffset = Math.floor(Math.random() * 11) * 10;
    const randomYOffset = Math.floor(Math.random() * 11) * 10;

    return {
        function_id: nodeDefinition.registeredFunctionId,
        workflow_id: workflowId,
        type: "functionNode",
        node_type: categoryName,
        step_name: nodeDefinition.name,
        execution_required: true,
        inputs: [],
        outputs: [],
        user_id: userId,
        is_active: true,
        ui_data: uiData || {
            width: 250,
            height: 125,
            position: {
                x: 500 + randomXOffset,
                y: 250 + randomYOffset,
            },
        },
        dependencies: [],
        metadata: {
            nodeDefinition: nodeDefinition,
        },
        is_public: false,
        authenticated_read: true,
        public_read: false,
    };
}

export const useCategoryNodeData = (workflowId?: string) => {
    const dispatch = useAppDispatch();
    const userId = useAppSelector(selectUserId);
    
    const categoryHook = useNodeCategoryWithFetch();
    const registeredNodeHook = useRegisteredNodeWithFetch();

    const categoryRecords = categoryHook.nodeCategoryRecordsById;
    const registeredNodeRecords = registeredNodeHook.registeredNodeRecordsById;

    const [isAddingNode, setIsAddingNode] = useState(false);

    // Memoized nodes grouped by category for efficient lookup
    const nodesByCategory = useMemo(() => {
        const grouped: Record<string, CategoryNodeData[]> = {};

        Object.values(registeredNodeRecords).forEach((node) => {
            const categoryId = node.category;
            if (!grouped[categoryId]) {
                grouped[categoryId] = [];
            }
            grouped[categoryId].push({
                id: node.id,
                name: node.name,
                description: node.description || "No description available",
                icon: node.icon,
                color: node.color,
            });
        });

        return grouped;
    }, [registeredNodeRecords]);

    const getNodeFunctionId = (nodeId: string) => {
        return registeredNodeRecords[nodeId]?.registeredFunctionId;
    };

    const getRegisteredNode = (functionId: string) => {
        return Object.values(registeredNodeRecords).find((node) => node.registeredFunctionId === functionId);
    };

    const handleAddWorkflowNode = async (functionId: string, targetWorkflowId?: string) => {
        if (!workflowId && !targetWorkflowId) {
            throw new Error("Workflow ID is required to add nodes");
        }
        
        const useWorkflowId = targetWorkflowId || workflowId!;
        setIsAddingNode(true);
        
        const registeredNode = getRegisteredNode(functionId);
        if (!registeredNode) {
            throw new Error("Registered node not found");
        }
        
        try {
            const newNodeData = newNodeFunction(
                registeredNode,
                useWorkflowId,
                userId,
                registeredNode.category
            );
            const newNode = await dispatch(createWorkflowNode(newNodeData)).unwrap();
            return newNode;
        } catch (error) {
            console.error("Failed to add node:", error);
            throw error;
        } finally {
            setIsAddingNode(false);
        }
    };

    const handleNodeAdd = async (
        nodeId: string, 
        targetWorkflowId?: string,
        onRecipeNodeCreated?: (nodeData: WorkflowNode) => void
    ) => {
        const functionId = getNodeFunctionId(nodeId);
        if (!functionId) {
            throw new Error("Function ID not found for node");
        }
        
        // Check if this is a recipe node
        if (functionId === RECIPE_FUNCTION_ID) {
            const result = await handleAddWorkflowNode(functionId, targetWorkflowId);
            if (result && onRecipeNodeCreated) {
                onRecipeNodeCreated(result);
            }
            return result;
        } else {
            return await handleAddWorkflowNode(functionId, targetWorkflowId);
        }
    };

    return {
        categoryRecords,
        registeredNodeRecords,
        nodesByCategory,
        getNodeFunctionId,
        getRegisteredNode,
        handleAddWorkflowNode,
        handleNodeAdd,
        isAddingNode,
        newNodeFunction,
    };
}; 