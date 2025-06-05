import { useCallback } from "react";
import { Node, Edge } from "reactflow";
import { BaseNode } from "@/features/workflows/types/backendTypes";
import { UserInputData } from "@/features/workflows/react-flow/nodes/UserInputNode";
import { BrokerRelayData } from "@/features/workflows/react-flow/nodes/BrokerRelayNode";
import { getNormalizedRegisteredFunctionNode } from "@/features/workflows/utils.ts/node-utils";
import { extractExecutionNodes, extractUserInputs, extractRelays } from "@/features/workflows/service/workflowTransformers";
import { saveWorkflowNode, saveWorkflowUserInput, saveWorkflowRelay } from "@/features/workflows/service/workflowService";

interface UseWorkflowActionsProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setEditingNode: React.Dispatch<React.SetStateAction<BaseNode | UserInputData | BrokerRelayData | null>>;
  workflowId?: string;
  userId: string;
}

export const useWorkflowActions = ({
  nodes,
  setNodes,
  setEdges,
  setEditingNode,
  workflowId,
  userId,
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
        const position = {
          x: Math.random() * 300 + 100,
          y: Math.random() * 300 + 100,
        };

        // ✅ Save to database first, get real UUID back
        const savedNode = await saveWorkflowNode(workflowId, userId, {
          function_id: baseNode.function_id,
          function_type: baseNode.function_type,
          step_name: baseNode.step_name,
          position_x: position.x,
          position_y: position.y,
          node_type: 'workflowNode',
          execution_required: baseNode.execution_required,
          additional_dependencies: baseNode.additional_dependencies,
          arg_mapping: baseNode.arg_mapping,
          return_broker_overrides: baseNode.return_broker_overrides,
          arg_overrides: baseNode.arg_overrides,
          status: baseNode.status || 'pending'
        });

        // ✅ Add to React Flow with real database ID
        const newNode: Node = {
          id: savedNode.id, // ✅ Real UUID from database
          type: "workflowNode",
          position,
          data: {
            ...baseNode,
            id: savedNode.id // ✅ Ensure data has real ID too
          },
        };
        setNodes((nds) => nds.concat(newNode));

      } else if (type === "userInput") {
        // ✅ Create user input in database immediately
        const position = {
          x: Math.random() * 300 + 100,
          y: Math.random() * 300 + 100,
        };

        const savedInput = await saveWorkflowUserInput(workflowId, userId, {
          broker_id: '', // ✅ Empty - user must set manually
          label: 'User Input',
          data_type: 'str' as const, // ✅ Valid Python type - explicit const assertion
          default_value: '',
          position_x: position.x,
          position_y: position.y,
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
        const position = {
          x: Math.random() * 300 + 100,
          y: Math.random() * 300 + 100,
        };

        const savedRelay = await saveWorkflowRelay(workflowId, userId, {
          source_broker_id: '', // ✅ Empty - user must set manually
          target_broker_ids: [],
          label: 'Broker Relay',
          position_x: position.x,
          position_y: position.y
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
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

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
            position_x: node?.position.x || 0,
            position_y: node?.position.y || 0,
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
            position_x: node?.position.x || 0,
            position_y: node?.position.y || 0
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
            position_x: node?.position.x || 0,
            position_y: node?.position.y || 0,
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
      } catch (error) {
        console.error('Failed to save node to database:', error);
      }
    }
  }, [setNodes, workflowId, userId, nodes]);

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
    prepareWorkflowData,
    exposeWorkflowMethods,
  };
};