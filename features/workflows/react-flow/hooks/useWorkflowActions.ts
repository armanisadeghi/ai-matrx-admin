import { useCallback } from "react";
import { Node, Edge } from "reactflow";
import { BaseNode, UserInputData, BrokerRelayData } from "@/features/workflows/types";
import { getNormalizedRegisteredFunctionNode } from "@/features/workflows/utils/node-utils";
import { extractExecutionNodes, extractUserInputs, extractRelays } from "@/features/workflows/service/workflowTransformers";
import { getIntelligentNodePosition } from "@/features/workflows/utils/nodePositioning";
import { 
  saveWorkflowNode, 
  saveWorkflowUserInput, 
  saveWorkflowRelay,
  deleteWorkflowNode,
  deleteWorkflowUserInput,
  deleteWorkflowRelay,
  removeNodeFromWorkflow,
  removeUserInputFromWorkflow,
  removeRelayFromWorkflow
} from "@/features/workflows/service/workflowService";

interface UseWorkflowActionsProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setEditingNode: React.Dispatch<React.SetStateAction<BaseNode | UserInputData | BrokerRelayData | null>>;
  workflowId?: string;
  userId: string;
  setDeleteDialogNode?: React.Dispatch<React.SetStateAction<Node | null>>;
  onWorkflowReload?: () => Promise<void>;
  getViewport?: () => { x: number; y: number; zoom: number };
}

export const useWorkflowActions = ({
  nodes,
  setNodes,
  setEdges,
  setEditingNode,
  workflowId,
  userId,
  setDeleteDialogNode,
  onWorkflowReload,
  getViewport,
}: UseWorkflowActionsProps) => {
  
  const handleAddNode = useCallback(async (id: string, type?: string) => {
    if (!workflowId) {
      console.error('Cannot add node: workflowId is required');
      return;
    }

    try {
      if (type === "registeredFunction") {
        // ✅ Create normalized function node and save to database immediately
        const baseNode = getNormalizedRegisteredFunctionNode(id);
        const viewport = getViewport?.();
        const position = getIntelligentNodePosition(nodes, viewport);

        // ✅ Create the React Flow node structure first
        const nodeStructure: Node = {
          id: 'placeholder', // Will be replaced with real UUID from database
          type: "workflowNode",
          position,
          data: {
            ...baseNode,
            id: 'placeholder' // Will be replaced with real UUID from database
          },
        };

        // ✅ Save to database first, get real UUID back
        const savedNode = await saveWorkflowNode(workflowId, userId, {
          function_id: baseNode.function_id,
          function_type: baseNode.function_type,
          step_name: baseNode.step_name,
          ui_node_data: nodeStructure, // Save the node structure
          node_type: 'workflowNode',
          execution_required: baseNode.execution_required,
          additional_dependencies: baseNode.additional_dependencies,
          arg_mapping: baseNode.arg_mapping,
          return_broker_overrides: baseNode.return_broker_overrides,
          arg_overrides: baseNode.arg_overrides,
          status: baseNode.status || 'pending'
        });

        // ✅ Add to React Flow with real database ID
        const finalNode: Node = {
          id: savedNode.id, // ✅ Real UUID from database
          type: "workflowNode",
          position,
          data: {
            ...baseNode,
            id: savedNode.id // ✅ Ensure data has real ID too
          },
        };
        setNodes((nds) => nds.concat(finalNode));

      } else if (type === "userInput") {
        // ✅ Create user input in database immediately
        const viewport = getViewport?.();
        const position = getIntelligentNodePosition(nodes, viewport);

        // ✅ Create the React Flow node structure first
        const inputNodeStructure: Node = {
          id: 'placeholder',
          type: "workflowNode",
          position,
          data: {
            id: 'placeholder',
            type: 'userInput',
            broker_id: '',
            value: '',
            label: 'User Input',
            data_type: 'str' as const
          },
        };

        const savedInput = await saveWorkflowUserInput(workflowId, userId, {
          broker_id: '', // ✅ Empty - user must set manually
          label: 'User Input',
          data_type: 'str' as const, // ✅ Valid Python type - explicit const assertion
          default_value: '',
          ui_node_data: inputNodeStructure, // Save the node structure
          is_required: false,
          field_component_id: null
        });

        const newUserInputData: UserInputData = {
          id: savedInput.id, // ✅ Real UUID from database
          type: 'userInput',
          broker_id: savedInput.broker_id,
          value: savedInput.default_value || '',
          label: savedInput.label || 'User Input',
          data_type: savedInput.data_type
        };

        const newNode: Node = {
          id: savedInput.id, // ✅ Real UUID from database
          type: "workflowNode",
          position,
          data: newUserInputData,
        };
        setNodes((nds) => nds.concat(newNode));

      } else if (type === "brokerRelay") {
        // ✅ Create broker relay in database immediately
        const viewport = getViewport?.();
        const position = getIntelligentNodePosition(nodes, viewport);

        // ✅ Create the React Flow node structure first
        const relayNodeStructure: Node = {
          id: 'placeholder',
          type: "workflowNode",
          position,
          data: {
            id: 'placeholder',
            type: 'brokerRelay',
            source: '',
            targets: [],
            label: 'Broker Relay'
          },
        };

        const savedRelay = await saveWorkflowRelay(workflowId, userId, {
          source_broker_id: '', // ✅ Empty - user must set manually
          target_broker_ids: [],
          label: 'Broker Relay',
          ui_node_data: relayNodeStructure // Save the node structure
        });

        const newBrokerRelayData: BrokerRelayData = {
          id: savedRelay.id, // ✅ Real UUID from database
          type: 'brokerRelay',
          source: savedRelay.source_broker_id,
          targets: savedRelay.target_broker_ids,
          label: savedRelay.label || 'Broker Relay'
        };

        const newNode: Node = {
          id: savedRelay.id, // ✅ Real UUID from database
          type: "workflowNode",
          position,
          data: newBrokerRelayData,
        };
        setNodes((nds) => nds.concat(newNode));
      }
    } catch (error) {
      console.error("Error adding node to database:", error);
    }
  }, [setNodes, workflowId, userId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(node => node.id === nodeId);
    if (nodeToDelete && setDeleteDialogNode) {
      setDeleteDialogNode(nodeToDelete);
    } else {
      // Fallback to immediate deletion if no dialog handler provided
      console.warn('No deletion dialog handler provided, performing immediate UI-only deletion');
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    }
  }, [nodes, setNodes, setEdges, setDeleteDialogNode]);

  const handleNodeSave = useCallback(async (updatedNode: BaseNode | UserInputData | BrokerRelayData) => {
    // ✅ Update local state first
    setNodes((nds) => nds.map((node) => 
      node.id === updatedNode.id ? { ...node, data: updatedNode } : node
    ));

    // ✅ Save to database if workflowId exists
    if (workflowId) {
      try {
        // Type guard for UserInputData
        if ('broker_id' in updatedNode && 'value' in updatedNode) {
          const userInputData = updatedNode as UserInputData;
          const node = nodes.find(n => n.id === updatedNode.id);
          const isUpdate = userInputData.id && !userInputData.id.startsWith('temp_');
          
          const dbData = {
            ...(isUpdate ? { id: userInputData.id } : {}), // ✅ Only pass id for updates
            broker_id: userInputData.broker_id,
            label: userInputData.label,
            data_type: userInputData.data_type,
            default_value: userInputData.value,
            ui_node_data: node, // Save the complete React Flow node
            is_required: false,
            field_component_id: null
            // ✅ NEVER pass created_at, updated_at - database handles these
          };
          
          await saveWorkflowUserInput(workflowId, userId, dbData);
        } 
        // Type guard for BrokerRelayData
        else if ('source' in updatedNode && 'targets' in updatedNode) {
          const relayData = updatedNode as BrokerRelayData;
          const node = nodes.find(n => n.id === updatedNode.id);
          const isUpdate = relayData.id && !relayData.id.startsWith('temp_');
          
          const dbData = {
            ...(isUpdate ? { id: relayData.id } : {}), // ✅ Only pass id for updates
            source_broker_id: relayData.source,
            target_broker_ids: relayData.targets,
            label: relayData.label,
            ui_node_data: node // Save the complete React Flow node
            // ✅ NEVER pass created_at, updated_at - database handles these
          };
          
          await saveWorkflowRelay(workflowId, userId, dbData);
        } 
        // Default to BaseNode
        else {
          const baseNode = updatedNode as BaseNode;
          const node = nodes.find(n => n.id === updatedNode.id);
          const isUpdate = baseNode.id && !baseNode.id.startsWith('temp_');
          
          const dbData = {
            ...(isUpdate ? { id: baseNode.id } : {}), // ✅ Only pass id for updates
            function_id: baseNode.function_id,
            function_type: baseNode.function_type,
            step_name: baseNode.step_name,
            ui_node_data: node, // Save the complete React Flow node
            node_type: 'workflowNode',
            execution_required: baseNode.execution_required,
            additional_dependencies: baseNode.additional_dependencies,
            arg_mapping: baseNode.arg_mapping,
            return_broker_overrides: baseNode.return_broker_overrides,
            arg_overrides: baseNode.arg_overrides,
            status: baseNode.status
            // ✅ NEVER pass created_at, updated_at - database handles these
          };
          
          await saveWorkflowNode(workflowId, userId, dbData);
        }
        
        console.log('✅ Node saved successfully');
        
        // ✅ Trigger workflow reload to regenerate virtual edges
        if (onWorkflowReload) {
          console.log('🔄 Reloading workflow to regenerate virtual edges...');
          await onWorkflowReload();
        }
      } catch (error) {
        console.error('Failed to save node to database:', error);
      }
    }
  }, [setNodes, workflowId, userId, nodes, onWorkflowReload]);

  const prepareWorkflowData = useCallback(() => {
    const workflowNodes = extractExecutionNodes(nodes);
    const userInputs = extractUserInputs(nodes);
    const relays = extractRelays(nodes);

    return {
      nodes: workflowNodes,
      user_inputs: userInputs,
      relays: relays
    };
  }, [nodes]);

  const handleRemoveFromWorkflow = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      // Remove from database workflow reference
      const data = node.data;
      if (data.type === 'userInput') {
        await removeUserInputFromWorkflow(nodeId);
      } else if (data.type === 'brokerRelay') {
        await removeRelayFromWorkflow(nodeId);
      } else {
        await removeNodeFromWorkflow(nodeId);
      }

      // Remove from UI
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    } catch (error) {
      console.error('❌ Failed to remove node from workflow:', error);
    }
  }, [nodes, setNodes, setEdges]);

  const handlePermanentDelete = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      // Delete permanently from database
      const data = node.data;
      if (data.type === 'userInput') {
        await deleteWorkflowUserInput(nodeId);
      } else if (data.type === 'brokerRelay') {
        await deleteWorkflowRelay(nodeId);
      } else {
        await deleteWorkflowNode(nodeId);
      }

      // Remove from UI
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    } catch (error) {
      console.error('❌ Failed to delete node permanently:', error);
    }
  }, [nodes, setNodes, setEdges]);

  const exposeWorkflowMethods = useCallback(() => {
    window.workflowSystemRef = {
      deleteNode: handleDeleteNode,
      editNode: (nodeData: any) => setEditingNode(nodeData),
      getUserInputs: () => {
        return nodes
          .map(node => node.data as UserInputData)
          .filter(data => data.type === 'userInput')
          .map(userInputData => ({
            broker_id: userInputData.broker_id,
            value: userInputData.value
          }));
      },
    };
  }, [nodes, handleDeleteNode, setEditingNode]);

  return {
    handleAddNode,
    handleDeleteNode,
    handleNodeSave,
    handleRemoveFromWorkflow,
    handlePermanentDelete,
    prepareWorkflowData,
    exposeWorkflowMethods,
  };
};