import React from 'react';
import WorkflowLoading from '@/features/workflows-xyflow/common/workflow-loading';

export default function WorkflowsLoading() {
  return (
    <WorkflowLoading 
      title="Loading Workflow Editor"
      subtitle="Setting up your workflow editor and loading components..."
      step1="Loading"
      step2="Initializing"
      step3="Ready"
    />
  );
} 