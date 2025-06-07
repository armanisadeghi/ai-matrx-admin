"use client";
import React from "react";
import WorkflowNodeEditor from "@/features/workflows/react-flow/node-editor/workflow-node-editor/WorkflowNodeEditor";
import UserInputEditor from "@/features/workflows/react-flow/node-editor/user-input-node-editor/UserInputEditor";
import BrokerRelayEditor from "@/features/workflows/react-flow/node-editor/broker-relay-node-editor/BrokerRelayEditor";
import { BaseNode, UserInputData, BrokerRelayData } from "@/features/workflows/types";
import { CustomNodeEditor, DefaultNodeEditor } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes";
import RecipeNodeEditor from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes/custom-nodes/recipes/RecipeNodeEditor";

interface NodeEditorManagerProps {
  editingNode: BaseNode | UserInputData | BrokerRelayData | null;
  onSave: (node: BaseNode | UserInputData | BrokerRelayData) => void;
  onClose: () => void;
  mode?: 'edit' | 'view' | 'execute';
}

export const NodeEditorManager: React.FC<NodeEditorManagerProps> = ({
  editingNode,
  onSave,
  onClose,
  mode = 'edit',
}) => {
  if (!editingNode) return null;

  const isReadOnly = mode === 'view';

  if ('type' in editingNode && editingNode.type === 'userInput') {
    return (
      <UserInputEditor 
        node={editingNode as UserInputData} 
        onSave={onSave} 
        onClose={onClose} 
        open={!!editingNode}
        readOnly={isReadOnly}
      />
    );
  }

  if ('type' in editingNode && editingNode.type === 'brokerRelay') {
    return (
      <BrokerRelayEditor 
        node={editingNode as BrokerRelayData} 
        onSave={onSave} 
        onClose={onClose} 
        open={!!editingNode}
        readOnly={isReadOnly}
      />
    );
  }


  const baseNode = editingNode as BaseNode;
  
  // Route to specific custom node editors based on function_id
  if (baseNode.function_id === "2ac5576b-d1ab-45b1-ab48-4e196629fdd8") {
    // Recipe nodes
    return (
      <RecipeNodeEditor
        node={baseNode}
        onSave={onSave}
        onClose={onClose}
        open={!!editingNode}
      />
    );
  }

  // Test the new system for other specific functions
  if (baseNode.function_id === "b42d270b-0627-453c-a4bb-920eb1da6c51") {
    return (
      <CustomNodeEditor
        node={baseNode}
        onSave={onSave}
        onClose={onClose}
        open={!!editingNode}
        component={DefaultNodeEditor}
        title="Custom Node Editor (Testing)"
      />
    );
  }

  return (
    <WorkflowNodeEditor 
      node={editingNode as BaseNode} 
      onSave={onSave} 
      onClose={onClose} 
      open={!!editingNode}
      readOnly={isReadOnly}
    />
  );
};

export default NodeEditorManager;