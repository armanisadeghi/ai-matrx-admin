"use client";
import React, { useCallback } from 'react';
import { NodeToolbar as ReactFlowNodeToolbar, Position, useReactFlow, useNodeId } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Settings, Copy, Trash2, Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { duplicateNode, deleteNode } from '@/lib/redux/workflow-node/thunks';
import { nodeToReactFlow } from '../../utils/nodeTransforms';

interface NodeToolbarProps {
  isVisible: boolean;
  positionAbsoluteX?: number;
  positionAbsoluteY?: number;
  onSettings?: () => void;
  onAddInput?: () => void;
  onRemoveInput?: () => void;
  canRemoveInput?: boolean;
  isCompact?: boolean;
  displayMode?: 'detailed' | 'compact';
  onDisplayModeToggle?: () => void;
}

export const NodeToolbar: React.FC<NodeToolbarProps> = ({
  isVisible,
  positionAbsoluteX = 0,
  positionAbsoluteY = 0,
  onSettings,
  onAddInput,
  onRemoveInput,
  canRemoveInput = true,
  isCompact = false,
  displayMode = 'detailed',
  onDisplayModeToggle,
}) => {
  const dispatch = useAppDispatch();
  const { deleteElements, addNodes } = useReactFlow();
  const nodeId = useNodeId();

  // Handle duplication with Redux + React Flow
  const handleDuplicate = useCallback(async () => {
    if (!nodeId) return;
    
    try {
      const newPosition = {
        x: positionAbsoluteX + 50,
        y: positionAbsoluteY + 50,
      };
      
      // Get the newly created node from the thunk
      const newNode = await dispatch(duplicateNode({ 
        currentNodeId: nodeId, 
        newNodePosition: newPosition 
      })).unwrap();
      
      const reactFlowNode = nodeToReactFlow(newNode);
      addNodes([reactFlowNode]);
      
    } catch (error) {
      console.error('Failed to duplicate node:', error);
    }
  }, [nodeId, positionAbsoluteX, positionAbsoluteY, dispatch, addNodes]);

  // Handle deletion with Redux
  const handleDelete = useCallback(async () => {
    if (!nodeId) return;
    
    try {
      // Delete from Redux first
      await dispatch(deleteNode(nodeId)).unwrap();
      
      // Then remove from React Flow UI
      deleteElements({ nodes: [{ id: nodeId }] });
    } catch (error) {
      console.error('Failed to delete node:', error);
      // If Redux deletion fails, still remove from UI as fallback
      deleteElements({ nodes: [{ id: nodeId }] });
    }
  }, [nodeId, dispatch, deleteElements]);

  const handleSettings = useCallback(() => {
    if (onSettings) {
      onSettings();
    } else {
      console.log('Open settings for node:', nodeId);
      // TODO: Implement default settings modal
    }
  }, [nodeId, onSettings]);

  return (
    <ReactFlowNodeToolbar 
      isVisible={isVisible} 
      position={Position.Top}
      offset={isCompact ? 20 : 12}
      className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSettings}
        className="h-6 w-6 p-0"
        title="Node Settings"
      >
        <Settings className="h-3 w-3" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDuplicate}
        className="h-6 w-6 p-0"
        title="Duplicate Node"
      >
        <Copy className="h-3 w-3" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={handleDelete}
        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
        title="Delete Node"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      
      {onDisplayModeToggle && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDisplayModeToggle}
          className="h-6 w-6 p-0"
          title={displayMode === 'compact' ? 'Expand Node' : 'Collapse Node'}
        >
          {displayMode === 'compact' ? (
            <Maximize2 className="h-3 w-3" />
          ) : (
            <Minimize2 className="h-3 w-3" />
          )}
        </Button>
      )}
      
      {(onAddInput || onRemoveInput) && (
        <>
          <div className="w-px h-4 bg-border mx-1" />
          
          {onAddInput && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAddInput}
              className="h-6 w-6 p-0"
              title="Add Input"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          
          {onRemoveInput && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRemoveInput}
              className="h-6 w-6 p-0"
              disabled={!canRemoveInput}
              title="Remove Input"
            >
              <Minus className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </ReactFlowNodeToolbar>
  );
};