"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import WorkflowEditor, { type NodeData } from './components/WorkflowEditor';
import WorkflowHeader from './components/WorkflowHeader';

// Define the type for the editor ref
interface WorkflowEditorHandle {
  getWorkflowData: () => {
    nodes: any[];
    edges: any[];
    selectedNode: any;
  };
  toggleBrokerView: () => void;
  showBrokerView: boolean;
}

function WorkflowPage() {
  console.log('WorkflowPage rendering');
  // Create a ref to access the editor's methods
  const editorRef = useRef<WorkflowEditorHandle>(null);
  const [showBrokers, setShowBrokers] = useState(false);
  // Create a ref to track update status
  const isUpdating = useRef(false);
  
  // Function to get workflow data from the editor
  const getWorkflowData = useCallback(() => {
    if (editorRef.current) {
      return editorRef.current.getWorkflowData();
    }
    // Return empty data if the editor ref isn't available yet
    return { nodes: [], edges: [], selectedNode: null };
  }, []);

  // Effect to sync the broker view state
  useEffect(() => {
    console.log('Page initial sync effect running');
    // This will only run once after mount to check initial state
    if (editorRef.current && editorRef.current.showBrokerView !== showBrokers) {
      console.log('Page initial sync - setting showBrokers to:', editorRef.current.showBrokerView);
      setShowBrokers(editorRef.current.showBrokerView);
    }
  }, []);

  // Toggle broker view with debounce protection and robust state handling
  const handleToggleBrokers = useCallback(() => {
    console.log('handleToggleBrokers called, current showBrokers:', showBrokers);
    if (editorRef.current) {
      // Use a local flag to prevent concurrent updates
      if (isUpdating.current) {
        console.log('Skipping toggle - update in progress');
        return;
      }
      
      isUpdating.current = true;
      
      // Get the current state before toggle
      const wasShowing = editorRef.current.showBrokerView;
      console.log('Before toggle - editor showBrokerView:', wasShowing);
      
      // Toggle the state in the editor
      editorRef.current.toggleBrokerView();
      
      // Get the new state after toggle
      const newState = editorRef.current.showBrokerView;
      console.log('After toggle - editor showBrokerView:', newState);
      
      // Only update if state actually changed
      if (newState !== showBrokers) {
        console.log('Updating page state after toggle to:', newState);
        setShowBrokers(newState);
      }
      
      // Release the update lock
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [showBrokers]);

  // Event handlers for header buttons
  const handleSave = useCallback(() => {
    console.log('Saving workflow:', getWorkflowData());
    // Implement saving logic here
  }, [getWorkflowData]);

  const handleRun = useCallback(() => {
    console.log('Running workflow:', getWorkflowData());
    // Implement running logic here
  }, [getWorkflowData]);

  const handleSettings = useCallback(() => {
    console.log('Opening workflow settings');
    // Implement settings logic here
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header using the new component */}
      <WorkflowHeader 
        title="My Workflow"
        getWorkflowData={getWorkflowData}
        showBrokers={showBrokers}
        onToggleBrokers={handleToggleBrokers}
        onSave={handleSave}
        onRun={handleRun}
        onSettings={handleSettings}
      />

      {/* Workflow Editor */}
      <div className="flex-1 overflow-hidden">
        <WorkflowEditor ref={editorRef} />
      </div>
    </div>
  );
}

export default WorkflowPage;