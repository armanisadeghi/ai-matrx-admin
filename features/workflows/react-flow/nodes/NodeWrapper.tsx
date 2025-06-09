"use client";
import React, { useEffect } from "react";
import { NodeProps, Handle, Position, useUpdateNodeInternals } from "reactflow";
import WorkflowNode from "@/features/workflows/react-flow/nodes/WorkflowNode";
import UserInputNode from "@/features/workflows/react-flow/nodes/UserInputNode";
import BrokerRelayNode from "@/features/workflows/react-flow/nodes/BrokerRelayNode";
import NodeFloatingIcon from "@/features/workflows/react-flow/nodes/NodeFloatingIcon";

// TypeScript declaration for window object
declare global {
  interface Window {
      workflowSystemRef?: {
          deleteNode: (nodeId: string) => void;
          editNode: (nodeData: any) => void;
          getUserInputs: () => { broker_id: string; value: string }[];
          duplicateNode: (nodeId: string) => void;
          duplicateNodeRPC: (nodeId: string) => void;
      };
  }
}


export const NodeWrapper: React.FC<NodeProps> = ({ data, selected, id }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  
  const handleDelete = (nodeId: string) => {
    window.workflowSystemRef?.deleteNode?.(nodeId);
  };

  const handleEdit = (nodeData: any) => {
    window.workflowSystemRef?.editNode?.(nodeData);
  };

  const handleDuplicate = (nodeId: string) => {
    window.workflowSystemRef?.duplicateNode?.(nodeId);
  };

  const handleDuplicateRPC = (nodeId: string) => {
    window.workflowSystemRef?.duplicateNodeRPC?.(nodeId);
  };

  const userInputs = window.workflowSystemRef?.getUserInputs?.() || [];

  // Update node internals when component mounts or when handles change
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals, data.type]);

  // Route to appropriate node component based on type
  if (data.type === 'userInput') {
    return (
      <div className="relative">
        <UserInputNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} onDuplicate={handleDuplicate} onDuplicateRPC={handleDuplicateRPC} />
        <NodeFloatingIcon nodeData={data} selected={selected} />
        {/* Output handle for user inputs */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            width: 12,
            height: 12,
            backgroundColor: '#10b981',
            border: '2px solid white',
            right: -6,
            zIndex: 1000
          }}
        />
      </div>
    );
  }
  
  if (data.type === 'brokerRelay') {
    return (
      <div className="relative">
        <BrokerRelayNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} onDuplicate={handleDuplicate} onDuplicateRPC={handleDuplicateRPC} />
        <NodeFloatingIcon nodeData={data} selected={selected} />
        {/* Input and output handles for relays */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            width: 12,
            height: 12,
            backgroundColor: '#3b82f6',
            border: '2px solid white',
            left: -6,
            zIndex: 1000
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            width: 12,
            height: 12,
            backgroundColor: '#22c55e',
            border: '2px solid white',
            right: -6,
            zIndex: 1000
          }}
        />
      </div>
    );
  }

  // Default to workflow node for registered functions
  return (
    <div className="relative">
      <WorkflowNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} onDuplicate={handleDuplicate} onDuplicateRPC={handleDuplicateRPC} userInputs={userInputs} />
      <NodeFloatingIcon nodeData={data} selected={selected} />
      {/* Input and output handles for workflow nodes */}
               <Handle
           type="target"
           position={Position.Left}
           id="input"
           style={{
             width: 12,
             height: 12,
             backgroundColor: '#3b82f6',
             border: '2px solid white',
             left: -6,
             zIndex: 1000
           }}
         />
         <Handle
           type="source"
           position={Position.Right}
           id="output"
           style={{
             width: 12,
             height: 12,
             backgroundColor: '#22c55e',
             border: '2px solid white',
             right: -6,
             zIndex: 1000
           }}
         />
    </div>
  );
};
