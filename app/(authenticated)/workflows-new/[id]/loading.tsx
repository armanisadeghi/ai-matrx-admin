import React from 'react';
import WorkflowLoading from '@/features/workflows-xyflow/common/workflow-loading';

export default function WorkflowPageLoading() {
  return (
    <WorkflowLoading 
      title="Loading Workflow"
      subtitle="Setting up your workflow editor and loading nodes..."
      step1="Loading"
      step2="Initializing" 
      step3="Ready"
    />
  );
} 