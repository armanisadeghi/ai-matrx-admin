"use client";
import React from "react";
import { WorkflowNodeData } from "@/features/workflows/types";
import { getWorkflowNodeIcon } from "@/features/workflows/common/workflowIcons";

interface NodeFloatingIconProps {
  nodeData: WorkflowNodeData;
  selected?: boolean;
}

export const NodeFloatingIcon: React.FC<NodeFloatingIconProps> = ({ 
  nodeData, 
  selected = false 
}) => {
  const IconComponent = getWorkflowNodeIcon(nodeData);

  return (
    <div className={`workflow-node-icon ${selected ? 'selected' : ''}`}>
      <div className="workflow-node-icon-inner">
        <IconComponent className="w-3 h-3 text-foreground" />
      </div>
    </div>
  );
};

export default NodeFloatingIcon; 