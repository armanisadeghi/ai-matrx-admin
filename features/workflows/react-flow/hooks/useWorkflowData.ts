import { useCallback } from "react";
import { Edge, Node, Viewport } from "reactflow";
import {
    fetchWorkflowByIdWithConversion,
    saveCompleteWorkflowWithConversion,
    createWorkflow as createWorkflowService,
} from "@/features/workflows/service/workflowService";
import { DbWorkflow, ConvertedWorkflowData } from "@/features/workflows/types";

export const useWorkflowData = () => {
    const loadWorkflow = useCallback(async (workflowId: string): Promise<ConvertedWorkflowData | null> => {
        try {
            const convertedData = await fetchWorkflowByIdWithConversion(workflowId);
            return convertedData;
        } catch (error) {
            console.error("Error loading workflow:", error);
            return null;
        }
    }, []);

    const saveWorkflow = useCallback(
        async (coreWorkflowData: DbWorkflow, nodes: Node[], edges: Edge[]) => {
            try {
                const dbEdges = edges.filter((edge) => edge.type !== "virtual");

                await saveCompleteWorkflowWithConversion(coreWorkflowData, nodes, dbEdges);
                return { success: true };
            } catch (error) {
                console.error("Error saving workflow:", error);
                throw error;
            }
        },
        []
    );

    const createWorkflow = useCallback(async (userId: string, workflowData: { name: string; description?: string }) => {
        try {
            const newWorkflow = await createWorkflowService(userId, {
                name: workflowData.name,
                description: workflowData.description || null,
            });

            return newWorkflow;
        } catch (error) {
            console.error("Error creating workflow:", error);
            throw error;
        }
    }, []);

    return {
        loadWorkflow,
        saveWorkflow,
        createWorkflow,
    };
};
