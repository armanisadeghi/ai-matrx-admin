"use client";
import React from "react";
import { NodeProps } from "reactflow";
import WorkflowNode from "@/features/workflows/react-flow/nodes/WorkflowNode";
import UserInputNode from "@/features/workflows/react-flow/nodes/UserInputNode";
import BrokerRelayNode from "@/features/workflows/react-flow/nodes/BrokerRelayNode";

export const WorkflowNodeWrapper: React.FC<NodeProps> = ({ data, selected }) => {
  const handleDelete = (nodeId: string) => {
    window.workflowSystemRef?.deleteNode?.(nodeId);
  };

  const handleEdit = (nodeData: any) => {
    window.workflowSystemRef?.editNode?.(nodeData);
  };

  const userInputs = window.workflowSystemRef?.getUserInputs?.() || [];

  // Route to appropriate node component based on type
  if (data.type === 'userInput') {
    return <UserInputNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
  }
  
  if (data.type === 'brokerRelay') {
    return <BrokerRelayNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
  }

  // Default to workflow node for registered functions
  return <WorkflowNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} userInputs={userInputs} />;
};
