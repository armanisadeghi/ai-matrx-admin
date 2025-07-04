'use client';

import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";

// Workflow imports
import {  workflowSelectors} from "@/lib/redux/workflow/selectors";
import {
  fetchAll as fetchAllWorkflows,
  fetchOneWithNodes,
  create as createWorkflow,
  update as updateWorkflow,
  saveWithNodes
} from "@/lib/redux/workflow/thunks";
import { workflowActions } from "@/lib/redux/workflow/slice";

// Workflow Node imports
import {  workflowNodesSelectors} from "@/lib/redux/workflow-nodes/selectors";
import {
  create as createWorkflowNode,
  update as updateWorkflowNode,
  deleteNode as deleteWorkflowNode
} from "@/lib/redux/workflow-node/thunks";
import { workflowNodeActions } from "@/lib/redux/workflow-node/slice";
import { selectUserId } from '@/lib/redux/selectors/userSelectors';

export default function WorkflowManagementTestPage() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);

  const allWorkflows = useAppSelector(workflowSelectors.allWorkflows);
  const workflowLoading = useAppSelector(workflowSelectors.loading);
  const workflowError = useAppSelector(workflowSelectors.error);
  const allWorkflowsLoading = useAppSelector(workflowSelectors.loading);

  // Workflow Node state
  const nodeLoading = useAppSelector(workflowNodesSelectors.loading);

  // Local state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [newNodeStepName, setNewNodeStepName] = useState('');
  const [newNodeType, setNewNodeType] = useState('');

  // Get workflow with nodes for selected workflow
  const selectedWorkflowWithNodes = useAppSelector(state => 
    selectedWorkflowId ? workflowSelectors.workflowWithNodesById(state, selectedWorkflowId) : null
  );

  useEffect(() => {
    if (userId) {
      dispatch(fetchAllWorkflows(userId));
    }
  }, [dispatch, userId]);

  const handleCreateWorkflow = async () => {
    if (!userId || !newWorkflowName.trim()) return;

    try {
      await dispatch(createWorkflow({
        name: newWorkflowName,
        description: newWorkflowDescription || null,
        workflow_type: 'custom',
        inputs: null,
        outputs: null,
        dependencies: null,
        sources: null,
        destinations: null,
        actions: null,
        category: 'test',
        tags: null,
        is_active: true,
        is_deleted: false,
        auto_execute: false,
        metadata: null,
        viewport: null,
        user_id: userId,
        is_public: false,
        authenticated_read: true,
        public_read: false,
      })).unwrap();

      setNewWorkflowName('');
      setNewWorkflowDescription('');
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleSelectWorkflow = async (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    await dispatch(fetchOneWithNodes(workflowId));
  };

  const handleCreateNode = async () => {
    if (!selectedWorkflowId || !newNodeStepName.trim() || !userId) return;

    try {
      await dispatch(createWorkflowNode({
        workflow_id: selectedWorkflowId,
        function_id: null,
        type: 'custom',
        step_name: newNodeStepName,
        node_type: newNodeType || 'action',
        execution_required: false,
        inputs: null,
        outputs: null,
        dependencies: null,
        metadata: null,
        ui_data: null,
        is_public: false,
        authenticated_read: true,
        public_read: true,
        user_id: userId,
      })).unwrap();

      setNewNodeStepName('');
      setNewNodeType('');
    } catch (error) {
      console.error('Failed to create workflow node:', error);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await dispatch(deleteWorkflowNode(nodeId));
    } catch (error) {
      console.error('Failed to delete workflow node:', error);
    }
  };

  const handleSaveWorkflowWithNodes = async () => {
    if (!selectedWorkflowWithNodes) return;

    try {
      await dispatch(saveWithNodes({
        workflow: {
          ...selectedWorkflowWithNodes,
          name: selectedWorkflowWithNodes.name + ' (Updated)',
        },
        nodes: selectedWorkflowWithNodes.nodes || []
      }));
    } catch (error) {
      console.error('Failed to save workflow with nodes:', error);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">Please log in to access this page.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Workflow Management Test
        </h1>

        {/* Error Display */}
        {workflowError && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">Error: {workflowError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Workflow Management */}
          <div className="space-y-6">
            {/* Create New Workflow */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Create New Workflow
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter workflow name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Enter workflow description"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleCreateWorkflow}
                  disabled={workflowLoading || !newWorkflowName.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {workflowLoading ? 'Creating...' : 'Create Workflow'}
                </button>
              </div>
            </div>

            {/* Workflows List */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                All Workflows ({allWorkflows.length})
              </h2>
              {allWorkflowsLoading ? (
                <div className="text-gray-600 dark:text-gray-400">Loading workflows...</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedWorkflowId === workflow.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleSelectWorkflow(workflow.id)}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {workflow.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {workflow.description || 'No description'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Type: {workflow.workflow_type || 'N/A'} | 
                        Active: {workflow.is_active ? 'Yes' : 'No'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Selected Workflow Details */}
          <div className="space-y-6">
            {selectedWorkflowWithNodes ? (
              <>
                {/* Workflow Details */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      Workflow Details
                    </h2>
                    <button
                      onClick={handleSaveWorkflowWithNodes}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save with Nodes
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {selectedWorkflowWithNodes.name}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {selectedWorkflowWithNodes.description || 'No description'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {selectedWorkflowWithNodes.workflow_type || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Nodes:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {selectedWorkflowWithNodes.nodes?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add New Node */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Add New Node
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Step Name
                      </label>
                      <input
                        type="text"
                        value={newNodeStepName}
                        onChange={(e) => setNewNodeStepName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Enter step name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Node Type
                      </label>
                      <select
                        value={newNodeType}
                        onChange={(e) => setNewNodeType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select type</option>
                        <option value="action">Action</option>
                        <option value="condition">Condition</option>
                        <option value="trigger">Trigger</option>
                        <option value="transform">Transform</option>
                      </select>
                    </div>
                    <button
                      onClick={handleCreateNode}
                      disabled={nodeLoading || !newNodeStepName.trim()}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {nodeLoading ? 'Creating...' : 'Add Node'}
                    </button>
                  </div>
                </div>

                {/* Workflow Nodes */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Workflow Nodes ({selectedWorkflowWithNodes.nodes?.length || 0})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedWorkflowWithNodes.nodes?.map((node) => (
                      <div
                        key={node.id}
                        className="p-4 border border-gray-200 dark:border-gray-600 rounded-md"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {node.step_name || 'Unnamed Step'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Type: {node.node_type || 'N/A'} | 
                              Execution Required: {node.execution_required ? 'Yes' : 'No'}
                            </div>
                            {node.function_id && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                Function ID: {node.function_id}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )) || (
                      <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No nodes in this workflow
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                  Select a workflow to view its details and manage nodes
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}