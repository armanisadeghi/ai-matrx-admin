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
  removeRelayFromWorkflow,
  duplicateWorkflowNode,
  duplicateWorkflowUserInput,
  duplicateWorkflowRelay,
  duplicateWorkflowNodeRPC,
  duplicateWorkflowUserInputRPC,
  duplicateWorkflowRelayRPC
} from "@/features/workflows/service/workflowService";
import { removeEdgesForNode } from "@/features/workflows/utils/edgeCleanup";

interface UseWorkflowActionsProps {
  nodes: Node[];
  edges: Edge[];
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
  edges,
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
    console.log("🔍 prepareWorkflowData - INPUT nodes sample:", 
      nodes.slice(0, 3).map(node => ({
        id: node.id,
        stepName: node.data?.step_name,
        returnBrokerOverrides: node.data?.return_broker_overrides,
        nodeType: node.type,
        dataKeys: node.data ? Object.keys(node.data) : []
      }))
    );

    const workflowNodes = extractExecutionNodes(nodes);
    const userInputs = extractUserInputs(nodes);
    const relays = extractRelays(nodes);

    console.log("🔍 prepareWorkflowData - final output before socket:", {
      workflowNodesCount: workflowNodes.length,
      sampleWorkflowNodes: workflowNodes.slice(0, 3).map(node => ({
        id: node.id,
        stepName: node.step_name,
        returnBrokerOverrides: node.return_broker_overrides,
        "node keys": Object.keys(node)
      }))
    });

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
      // ✅ Clean up connected edges from database first
      await removeEdgesForNode(nodeId, edges);

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
      
      // ✅ Trigger workflow reload to regenerate virtual edges
      if (onWorkflowReload) {
        console.log('🔄 Reloading workflow after node removal...');
        await onWorkflowReload();
      }
    } catch (error) {
      console.error('❌ Failed to remove node from workflow:', error);
    }
  }, [nodes, edges, setNodes, setEdges, onWorkflowReload]);

  const handlePermanentDelete = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    try {
      // ✅ Clean up connected edges from database first
      await removeEdgesForNode(nodeId, edges);

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
      
      // ✅ Trigger workflow reload to regenerate virtual edges
      if (onWorkflowReload) {
        console.log('🔄 Reloading workflow after node deletion...');
        await onWorkflowReload();
      }
    } catch (error) {
      console.error('❌ Failed to delete node permanently:', error);
    }
  }, [nodes, edges, setNodes, setEdges, onWorkflowReload]);

  // Helper function to find a good position for duplicated nodes
  const findAvailablePosition = useCallback((originalPosition: { x: number; y: number }, centerOnScreen: boolean = false) => {
    // Option 1: Center on screen
    if (centerOnScreen) {
      const viewport = getViewport?.() || { x: 0, y: 0, zoom: 1 };
      // Calculate center of the current viewport
      const centerX = (-viewport.x / viewport.zoom) + (window.innerWidth / (2 * viewport.zoom));
      const centerY = (-viewport.y / viewport.zoom) + (window.innerHeight / (2 * viewport.zoom));
      
      return {
        x: centerX - 100, // Offset slightly from exact center
        y: centerY - 50
      };
    }

    // Option 2: Smart offset from original position
    const baseOffsetX = 120; // Increased horizontal offset
    const baseOffsetY = 80;  // Increased vertical offset
    const maxAttempts = 12;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Try different offset patterns
      let offsetX, offsetY;
      
      if (attempt <= 4) {
        // First 4 attempts: right and down
        offsetX = baseOffsetX * attempt;
        offsetY = baseOffsetY * ((attempt - 1) % 2 === 0 ? 0 : 1);
      } else if (attempt <= 8) {
        // Next 4 attempts: down and right
        offsetX = baseOffsetX * ((attempt - 5) % 2 === 0 ? 0 : 1);
        offsetY = baseOffsetY * (attempt - 4);
      } else {
        // Final attempts: diagonal pattern
        const diagAttempt = attempt - 8;
        offsetX = baseOffsetX * diagAttempt;
        offsetY = baseOffsetY * diagAttempt;
      }
      
      const candidatePosition = {
        x: originalPosition.x + offsetX,
        y: originalPosition.y + offsetY
      };
      
      // Check if any existing node is too close to this position
      const tooClose = nodes.some(node => {
        const distance = Math.sqrt(
          Math.pow(node.position.x - candidatePosition.x, 2) + 
          Math.pow(node.position.y - candidatePosition.y, 2)
        );
        return distance < 80; // Minimum distance between nodes
      });
      
      if (!tooClose) {
        return candidatePosition;
      }
    }
    
    // Fallback: if all offset positions are occupied, place in center of screen
    console.log('All offset positions occupied, falling back to center screen positioning');
    const viewport = getViewport?.() || { x: 0, y: 0, zoom: 1 };
    const centerX = (-viewport.x / viewport.zoom) + (window.innerWidth / (2 * viewport.zoom));
    const centerY = (-viewport.y / viewport.zoom) + (window.innerHeight / (2 * viewport.zoom));
    
    return {
      x: centerX - 100, // Offset slightly from exact center
      y: centerY - 50
    };
  }, [nodes, getViewport]);

  const handleDuplicateNode = useCallback(async (nodeId: string) => {
    if (!workflowId) {
      console.error('Cannot duplicate node: workflowId is required');
      return;
    }

    const originalNode = nodes.find(n => n.id === nodeId);
    if (!originalNode) {
      console.error('Node not found for duplication');
      return;
    }

    try {
      const data = originalNode.data;
      let newNode: Node;

      // Calculate position for the duplicate with improved spacing
      // Use offset positioning (set to true for center-screen positioning)
      const newPosition = findAvailablePosition(originalNode.position, false);

      if (data.type === 'userInput') {
        // Duplicate user input
        const duplicatedInput = await duplicateWorkflowUserInput(nodeId, workflowId, userId);
        
        const newUserInputData: UserInputData = {
          id: duplicatedInput.id,
          type: 'userInput',
          broker_id: duplicatedInput.broker_id,
          value: duplicatedInput.default_value || '',
          label: duplicatedInput.label || 'User Input COPY',
          data_type: duplicatedInput.data_type
        };

        newNode = {
          id: duplicatedInput.id,
          type: "workflowNode",
          position: newPosition,
          data: newUserInputData
        };

        // Update the database with the correct position
        await saveWorkflowUserInput(workflowId, userId, {
          id: duplicatedInput.id,
          ui_node_data: newNode
        });
        
      } else if (data.type === 'brokerRelay') {
        // Duplicate broker relay
        const duplicatedRelay = await duplicateWorkflowRelay(nodeId, workflowId, userId);
        
        const newBrokerRelayData: BrokerRelayData = {
          id: duplicatedRelay.id,
          type: 'brokerRelay',
          source: duplicatedRelay.source_broker_id,
          targets: duplicatedRelay.target_broker_ids,
          label: duplicatedRelay.label || 'Broker Relay COPY'
        };

        newNode = {
          id: duplicatedRelay.id,
          type: "workflowNode",
          position: newPosition,
          data: newBrokerRelayData
        };

        // Update the database with the correct position
        await saveWorkflowRelay(workflowId, userId, {
          id: duplicatedRelay.id,
          ui_node_data: newNode
        });
        
      } else {
        // Duplicate workflow node
        const duplicatedNode = await duplicateWorkflowNode(nodeId, workflowId, userId);
        
        newNode = {
          id: duplicatedNode.id,
          type: "workflowNode",
          position: newPosition,
          data: {
            ...originalNode.data,
            id: duplicatedNode.id,
            step_name: duplicatedNode.step_name // This will have "COPY" appended
          }
        };

        // Update the database with the correct position
        await saveWorkflowNode(workflowId, userId, {
          id: duplicatedNode.id,
          ui_node_data: newNode
        });
      }

      // Add to UI first
      setNodes((nds) => nds.concat(newNode));
      
      // ✅ Trigger workflow reload to regenerate virtual edges (now with correct position in DB)
      if (onWorkflowReload) {
        console.log('🔄 Reloading workflow after node duplication...');
        await onWorkflowReload();
      }
    } catch (error) {
      console.error('❌ Failed to duplicate node:', error);
    }
  }, [nodes, workflowId, userId, setNodes, findAvailablePosition, onWorkflowReload]);

  const handleDuplicateNodeRPC = useCallback(async (nodeId: string) => {
    if (!workflowId) {
      console.error('Cannot duplicate node via RPC: workflowId is required');
      return;
    }

    const originalNode = nodes.find(n => n.id === nodeId);
    if (!originalNode) {
      console.error('Node not found for RPC duplication');
      return;
    }

    try {
      const data = originalNode.data;
      let newNode: Node;
      let duplicatedData: any;

      // Calculate position for the duplicate with improved spacing
      // Use center-screen positioning for RPC duplicates to differentiate
      const newPosition = findAvailablePosition(originalNode.position, true);

      if (data.type === 'userInput') {
        // Duplicate user input via RPC
        duplicatedData = await duplicateWorkflowUserInputRPC(nodeId);
        
        const newUserInputData: UserInputData = {
          id: duplicatedData.id,
          type: 'userInput',
          broker_id: duplicatedData.broker_id,
          value: duplicatedData.default_value || '',
          label: `${duplicatedData.label || 'User Input'} RPC`,
          data_type: duplicatedData.data_type
        };

        newNode = {
          id: duplicatedData.id,
          type: "workflowNode",
          position: newPosition,
          data: newUserInputData
        };

        // Update the database with the correct position
        await saveWorkflowUserInput(workflowId, userId, {
          id: duplicatedData.id,
          ui_node_data: newNode
        });
        
      } else if (data.type === 'brokerRelay') {
        // Duplicate broker relay via RPC
        duplicatedData = await duplicateWorkflowRelayRPC(nodeId);
        
        const newBrokerRelayData: BrokerRelayData = {
          id: duplicatedData.id,
          type: 'brokerRelay',
          source: duplicatedData.source_broker_id,
          targets: duplicatedData.target_broker_ids,
          label: `${duplicatedData.label || 'Broker Relay'} RPC`
        };

        newNode = {
          id: duplicatedData.id,
          type: "workflowNode",
          position: newPosition,
          data: newBrokerRelayData
        };

        // Update the database with the correct position
        await saveWorkflowRelay(workflowId, userId, {
          id: duplicatedData.id,
          ui_node_data: newNode
        });
        
      } else {
        // Duplicate workflow node via RPC
        duplicatedData = await duplicateWorkflowNodeRPC(nodeId);
        
        newNode = {
          id: duplicatedData.id,
          type: "workflowNode",
          position: newPosition,
          data: {
            ...originalNode.data,
            id: duplicatedData.id,
            step_name: `${duplicatedData.step_name || 'Unnamed Step'} RPC`
          }
        };

        // Update the database with the correct position
        await saveWorkflowNode(workflowId, userId, {
          id: duplicatedData.id,
          ui_node_data: newNode
        });
      }

      // Add to UI first
      setNodes((nds) => nds.concat(newNode));
      
      // ✅ Trigger workflow reload to regenerate virtual edges (now with correct position in DB)
      if (onWorkflowReload) {
        console.log('🔄 Reloading workflow after RPC node duplication...');
        await onWorkflowReload();
      }
    } catch (error) {
      console.error('❌ Failed to duplicate node via RPC:', error);
    }
  }, [nodes, workflowId, userId, setNodes, findAvailablePosition, onWorkflowReload]);

  const exposeWorkflowMethods = useCallback(() => {
    window.workflowSystemRef = {
      deleteNode: handleDeleteNode,
      editNode: (nodeData: any) => setEditingNode(nodeData),
      duplicateNode: handleDuplicateNode,
      duplicateNodeRPC: handleDuplicateNodeRPC,
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
  }, [nodes, handleDeleteNode, setEditingNode, handleDuplicateNode, handleDuplicateNodeRPC]);

  return {
    handleAddNode,
    handleDeleteNode,
    handleNodeSave,
    handleRemoveFromWorkflow,
    handlePermanentDelete,
    handleDuplicateNode,
    handleDuplicateNodeRPC,
    prepareWorkflowData,
    exposeWorkflowMethods,
  };
};