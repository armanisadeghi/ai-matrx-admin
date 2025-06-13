"use client";
import React from "react";
import { DbNodeData } from "@/features/workflows/types";
import { getWorkflowNodeIcon } from "@/features/workflows/components/common/workflowIcons";


interface NodeFloatingIconProps {
  nodeData: DbNodeData;
  type: string;
  selected?: boolean;
}

export const NodeFloatingIcon: React.FC<NodeFloatingIconProps> = ({ 
  nodeData, 
  type,
  selected = false 
}) => {

  const IconComponent = getWorkflowNodeIcon(nodeData, type);

  return (
    <div className={`workflow-node-icon ${selected ? 'selected' : ''}`}>
      <div className="workflow-node-icon-inner">
        <IconComponent className="w-3 h-3 text-foreground" />
      </div>
    </div>
  );
};

export default NodeFloatingIcon; 