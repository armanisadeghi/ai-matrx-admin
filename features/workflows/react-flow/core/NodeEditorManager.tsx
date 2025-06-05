"use client";
import React from "react";
import NodeEditor from "@/features/workflows/react-flow/node-editor/NodeEditor";
import UserInputEditor from "@/features/workflows/react-flow/nodes/UserInputEditor";
import BrokerRelayEditor from "@/features/workflows/react-flow/nodes/BrokerRelayEditor";
import { BaseNode } from "@/features/workflows/types/backendTypes";
import { UserInputData } from "@/features/workflows/react-flow/nodes/UserInputNode";
import { BrokerRelayData } from "@/features/workflows/react-flow/nodes/BrokerRelayNode";

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
    <NodeEditor 
      node={editingNode as BaseNode} 
      onSave={onSave} 
      onClose={onClose} 
      open={!!editingNode}
      readOnly={isReadOnly}
    />
  );
};

export default NodeEditorManager;