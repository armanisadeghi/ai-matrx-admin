// Component Structure for Workflow Builder

// 1. Main Container Component
// src/components/workflow/WorkflowBuilder.jsx
import React from 'react';
import WorkflowHeader from './WorkflowHeader';
import WorkflowCanvas from './WorkflowCanvas';
import ComponentLibrary from './ComponentLibrary';
import PropertiesPanel from './PropertiesPanel';
import NotificationSystem from './NotificationSystem';
import { WorkflowProvider } from './WorkflowContext';

const WorkflowBuilder = () => {
  return (
    <WorkflowProvider>
      <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
        <WorkflowHeader />
        <div className="flex-1 flex overflow-hidden">
          <ComponentLibrary />
          <WorkflowCanvas />
          <PropertiesPanel />
        </div>
        <NotificationSystem />
      </div>
    </WorkflowProvider>
  );
};

export default WorkflowBuilder;


