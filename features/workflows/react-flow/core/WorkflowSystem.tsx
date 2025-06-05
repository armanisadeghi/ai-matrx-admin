"use client";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
  Connection,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import { WorkflowToolbar } from "@/features/workflows/react-flow/core/WorkflowToolbar";
import { WorkflowCanvas } from "@/features/workflows/react-flow/core/WorkflowCanvas";
import { NodeEditorManager } from "@/features/workflows/react-flow/core/NodeEditorManager";
import { NodeDeleteDialog } from "@/features/workflows/components/NodeDeleteDialog";
import { useWorkflowData } from "@/features/workflows/react-flow/hooks/useWorkflowData";
import { useWorkflowActions } from "@/features/workflows/react-flow/hooks/useWorkflowActions";
import { BaseNode, UserInputData, BrokerRelayData } from "@/features/workflows/types";
import { NodeWrapper } from "@/features/workflows/react-flow/nodes/NodeWrapper";
import { useAppSelector } from "@/lib/redux";
import { selectUser } from "@/lib/redux/selectors/userSelectors";

interface WorkflowSystemProps {
  workflowId?: string;
  mode?: 'edit' | 'view' | 'execute';
  onSave?: (workflowData: any) => void;
  onExecute?: (workflowData: any) => void;
}

export const WorkflowSystem: React.FC<WorkflowSystemProps> = ({
  workflowId,
  mode = 'edit',
  onSave,
  onExecute,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingNode, setEditingNode] = useState<BaseNode | UserInputData | BrokerRelayData | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [workflowMetadata, setWorkflowMetadata] = useState<any>(null);
  const [deleteDialogNode, setDeleteDialogNode] = useState<Node | null>(null);
  const [isDeletionProcessing, setIsDeletionProcessing] = useState(false);
  const user = useAppSelector(selectUser);
  // Load workflow data if workflowId is provided
  const { loadWorkflow, saveWorkflow } = useWorkflowData();
  
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId).then((workflowData) => {
        if (workflowData) {
          setNodes(workflowData.nodes || []);
          setEdges(workflowData.edges || []);
          setWorkflowMetadata(workflowData.metadata);
        }
      });
    }
  }, [workflowId, loadWorkflow, setNodes, setEdges]);

  // Create workflow reload function
  const handleWorkflowReload = useCallback(async () => {
    if (workflowId) {
      const workflowData = await loadWorkflow(workflowId);
      if (workflowData) {
        setNodes(workflowData.nodes || []);
        setEdges(workflowData.edges || []);
        setWorkflowMetadata(workflowData.metadata);
      }
    }
  }, [workflowId, loadWorkflow, setNodes, setEdges]);

  const {
    handleAddNode,
    handleDeleteNode,
    handleNodeSave,
    handleRemoveFromWorkflow,
    handlePermanentDelete,
    prepareWorkflowData,
    exposeWorkflowMethods,
  } = useWorkflowActions({
    nodes,
    setNodes,
    setEdges,
    setEditingNode,
    workflowId,
    userId: user.id,
    setDeleteDialogNode,
    onWorkflowReload: handleWorkflowReload,
  });

  // Expose methods for node components
  useEffect(() => {
    exposeWorkflowMethods();
    return () => {
      delete window.workflowSystemRef;
    };
  }, [exposeWorkflowMethods]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      workflowNode: NodeWrapper,
    }),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.button === 2 || mode === 'view') return;
    setEditingNode(node.data as BaseNode | UserInputData | BrokerRelayData);
  }, [mode]);

  const handleSaveWorkflow = useCallback(() => {
    const workflowData = {
      nodes,
      edges
    };
    
    if (workflowId) {
      saveWorkflow(workflowId, user.id, workflowData);
    }
    
    onSave?.(workflowData);
  }, [nodes, edges, workflowId, user.id, saveWorkflow, onSave]);

  const handleExecuteWorkflow = useCallback(() => {
    const workflowData = prepareWorkflowData();
    onExecute?.(workflowData);
  }, [prepareWorkflowData, onExecute]);

  const handleRemoveFromWorkflowWithDialog = useCallback(async (nodeId: string) => {
    setIsDeletionProcessing(true);
    try {
      await handleRemoveFromWorkflow(nodeId);
      setDeleteDialogNode(null);
    } finally {
      setIsDeletionProcessing(false);
    }
  }, [handleRemoveFromWorkflow]);

  const handlePermanentDeleteWithDialog = useCallback(async (nodeId: string) => {
    setIsDeletionProcessing(true);
    try {
      await handlePermanentDelete(nodeId);
      setDeleteDialogNode(null);
    } finally {
      setIsDeletionProcessing(false);
    }
  }, [handlePermanentDelete]);

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <WorkflowToolbar
        selectedFunction={selectedFunction}
        onFunctionSelect={setSelectedFunction}
        onAddNode={handleAddNode}
        nodes={nodes}
        edges={edges}
        onSave={mode === 'edit' ? handleSaveWorkflow : undefined}
        onExecute={handleExecuteWorkflow}
        prepareWorkflowData={prepareWorkflowData}
        mode={mode}
        workflowName={workflowMetadata?.name}
      />

      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        onAddNode={handleAddNode}
        mode={mode}
      />

      <NodeEditorManager
        editingNode={editingNode}
        onSave={handleNodeSave}
        onClose={() => setEditingNode(null)}
        mode={mode}
      />

      <NodeDeleteDialog
        node={deleteDialogNode}
        isOpen={!!deleteDialogNode}
        onClose={() => setDeleteDialogNode(null)}
        onRemoveFromWorkflow={handleRemoveFromWorkflowWithDialog}
        onPermanentDelete={handlePermanentDeleteWithDialog}
        isProcessing={isDeletionProcessing}
      />
    </div>
  );
};

export default WorkflowSystem;