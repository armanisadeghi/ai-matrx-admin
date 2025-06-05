"use client";
import React from "react";
import WorkflowNodeEditor from "@/features/workflows/react-flow/node-editor/workflow-node-editor/WorkflowNodeEditor";
import UserInputEditor from "@/features/workflows/react-flow/node-editor/user-input-node-editor/UserInputEditor";
import BrokerRelayEditor from "@/features/workflows/react-flow/node-editor/broker-relay-node-editor/BrokerRelayEditor";
import { BaseNode, UserInputData, BrokerRelayData } from "@/features/workflows/types";

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