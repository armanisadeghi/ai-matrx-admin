"use client";

import React, { memo, useState } from 'react';
import {
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
  BaseEdge,
  EdgeMarker,
} from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Settings, Zap } from 'lucide-react';
import { EdgeSettingsOverlay } from './EdgeSettingsOverlay';

interface WorkflowEdgeData extends Record<string, unknown> {
  label?: string;
  type?: 'data' | 'control' | 'error' | 'conditional';
  condition?: string;
  animated?: boolean;
  weight?: number;
  color?: string;
}

interface WorkflowEdgeProps extends EdgeProps {
  data?: WorkflowEdgeData;
}

const WorkflowEdgeComponent: React.FC<WorkflowEdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    selected,
    markerEnd,
    markerStart,
    source,
    target,
    animated,
    label,
  } = props;
  const { deleteElements, updateEdge } = useReactFlow();
  
  // State for edge settings overlay
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Reconstruct the complete edge object for the overlay
  const completeEdge = props;

  // Calculate edge path
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  // Enhanced styling based on edge type
  const getEdgeStyle = () => {
    const baseStyle = {
      strokeWidth: selected ? 3 : 2,
      ...style,
    };

    switch (data?.type) {
      case 'data':
        return {
          ...baseStyle,
          stroke: data.color || '#3b82f6',
          strokeDasharray: '0',
        };
      case 'control':
        return {
          ...baseStyle,
          stroke: data.color || '#10b981',
          strokeDasharray: '5,5',
        };
      case 'error':
        return {
          ...baseStyle,
          stroke: data.color || '#ef4444',
          strokeDasharray: '10,5',
        };
      case 'conditional':
        return {
          ...baseStyle,
          stroke: data.color || '#f59e0b',
          strokeDasharray: '15,5,5,5',
        };
      default:
        return {
          ...baseStyle,
          stroke: data?.color || style.stroke || '#6b7280',
        };
    }
  };

  // Enhanced markers
  const getMarkerEnd = () => {
    return 'url(#arrow)';
  };

  // Handle edge deletion
  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  // Handle edge settings - now opens the overlay
  const handleSettings = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsSettingsOpen(true);
  };

  // Toggle animation
  const handleToggleAnimation = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (updateEdge) {
      updateEdge(id, {
        animated: !data?.animated,
        data: { ...data, animated: !data?.animated },
      });
    }
  };

  const edgeStyle = getEdgeStyle();

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={edgeStyle}
        markerEnd={getMarkerEnd()}
        markerStart={markerStart}
      />
      
      {/* Edge Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Label Content */}
          {(data?.label || data?.condition || selected) && (
            <div className="flex flex-col items-center gap-1">
              {/* Main Label */}
              {data?.label && (
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-background/90 backdrop-blur-sm border shadow-sm"
                >
                  {data.label}
                </Badge>
              )}
              
              {/* Condition Label */}
              {data?.condition && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-background/90 backdrop-blur-sm border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300"
                >
                  {data.condition}
                </Badge>
              )}
              
              {/* Type Badge */}
              {data?.type && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-background/90 backdrop-blur-sm"
                  style={{ 
                    borderColor: edgeStyle.stroke,
                    color: edgeStyle.stroke 
                  }}
                >
                  {data.type}
                </Badge>
              )}
              
              {/* Weight indicator */}
              {data?.weight && (
                <div className="text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-1 rounded">
                  {data.weight}
                </div>
              )}
              
              {/* Controls (only when selected) */}
              {selected && (
                <div className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSettings}
                    className="h-6 w-6 p-0"
                    title="Settings"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleToggleAnimation}
                    className="h-6 w-6 p-0"
                    title={data?.animated ? "Disable Animation" : "Enable Animation"}
                  >
                    <Zap className={`h-3 w-3 ${data?.animated ? 'text-yellow-500' : ''}`} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      {/* Edge Settings Overlay */}
      <EdgeSettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        edge={completeEdge}
      />
    </>
  );
};

export const WorkflowEdge = memo(WorkflowEdgeComponent); 