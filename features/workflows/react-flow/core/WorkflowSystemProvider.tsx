"use client";
import React from "react";
import { WorkflowSystem } from "@/features/workflows/react-flow/core/WorkflowSystem";

interface WorkflowSystemProviderProps {
  workflowId?: string;
  mode?: 'edit' | 'view' | 'execute';
  onSave?: (workflowData: any) => void;
  onExecute?: (workflowData: any) => void;
}

export const WorkflowSystemProvider: React.FC<WorkflowSystemProviderProps> = ({
  workflowId,
  mode = 'edit',
  onSave,
  onExecute,
}) => {
  return (
      <WorkflowSystem
        workflowId={workflowId}
        mode={mode}
        onSave={onSave}
        onExecute={onExecute}
      />
  );
};
