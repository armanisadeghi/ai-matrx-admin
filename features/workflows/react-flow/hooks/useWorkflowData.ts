import { useCallback } from "react";
import { Node, Edge } from "reactflow";
import { 
  fetchWorkflowById, 
  saveCompleteWorkflow,
  createWorkflow as createWorkflowService,
  WorkflowData,
  CompleteWorkflowData 
} from "@/features/workflows/service/workflowService";
import { 
  transformDbToReactFlow,
  transformNodeToDb,
  transformEdgeToDb 
} from "@/features/workflows/service/workflowTransformers";
import { analyzeBrokerConnections } from "@/features/workflows/utils/brokerEdgeAnalyzer";

interface WorkflowDataForReactFlow {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  metadata: WorkflowData;
}

export const useWorkflowData = () => {
  const loadWorkflow = useCallback(async (workflowId: string): Promise<WorkflowDataForReactFlow | null> => {
    try {
      const completeData = await fetchWorkflowById(workflowId);
      
      // ✅ OPTIMAL LOCATION: Analyze broker connections before transformation
      const virtualEdges = analyzeBrokerConnections(completeData);
      
      const { nodes, edges, viewport } = transformDbToReactFlow(completeData);
      
      // Combine database edges with computed broker-based edges
      const allEdges = [...edges, ...virtualEdges];
      
      return {
        nodes,
        edges: allEdges,
        viewport,
        metadata: completeData.workflow
      };
    } catch (error) {
      console.error('Error loading workflow:', error);
      return null;
    }
  }, []);

  const saveWorkflow = useCallback(async (
    workflowId: string, 
    userId: string,
    workflowData: {
      nodes: Node[];
      edges: Edge[];
      metadata?: Partial<WorkflowData>;
    }
  ) => {
    try {
      // Transform nodes by type
      const workflowNodes: any[] = [];
      const userInputs: any[] = [];
      const relays: any[] = [];

      workflowData.nodes.forEach(node => {
        const transformed = transformNodeToDb(node, workflowId);
        
        switch (transformed.type) {
          case 'workflow':
            workflowNodes.push(transformed.data);
            break;
          case 'userInput':
            userInputs.push(transformed.data);
            break;
          case 'relay':
            relays.push(transformed.data);
            break;
        }
      });

      // Transform edges
      const edges = workflowData.edges
        .map(edge => transformEdgeToDb(edge))
        .filter(edge => edge.id && edge.source_node_id && edge.target_node_id) as any[];

      // Save everything
      await saveCompleteWorkflow(workflowId, userId, {
        workflow: workflowData.metadata,
        nodes: workflowNodes,
        userInputs: userInputs,
        relays: relays,
        edges: edges
      });

      return { success: true };
    } catch (error) {
      console.error('Error saving workflow:', error);
      throw error;
    }
  }, []);

  const createWorkflow = useCallback(async (
    userId: string,
    workflowData: { name: string; description?: string }
  ) => {
    try {
      const newWorkflow = await createWorkflowService(userId, {
        name: workflowData.name,
        description: workflowData.description || null
      });
      
      return newWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }, []);

  return {
    loadWorkflow,
    saveWorkflow,
    createWorkflow,
  };
};
