"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { getHandleColor } from '../../utils/nodeStyles';
import { toTitleCase } from '@/utils/dataUtils';

// Generic handle interface for reusable component
export interface NodeHandle {
  /** Unique identifier for this handle - must be unique across the node */
  id: string;
  /** Display label for the handle */
  label: string;
  /** Optional metadata for the handle */
  metadata?: Record<string, any>;
}

interface NodeHandlesProps {
  /** Array of input handles to render */
  inputHandles?: NodeHandle[];
  /** Array of output handles to render */
  outputHandles?: NodeHandle[];
  /** Optional validation function for connections */
  isValidConnection?: (connection: any) => boolean;
}

export const NodeHandles: React.FC<NodeHandlesProps> = ({
  inputHandles = [],
  outputHandles = [],
  isValidConnection,
}) => {
  return (
    <>
      {/* Input handles */}
      {inputHandles.map((handle) => (
        <div key={`input-${handle.id}`} className="relative flex items-center mb-1">
          <Handle
            type="target"
            position={Position.Left}
            id={handle.id}
            className={`${getHandleColor('input')}`}
            style={{ 
              left: -10
            }}
            isValidConnection={isValidConnection}
          />
          <div className="text-[8px] text-muted-foreground pr-2">
            <div className="font-small leading-tight">
              {handle.label}
            </div>
          </div>
        </div>
      ))}
      
      {/* Output handles */}
      {outputHandles.map((handle) => (
        <div key={`output-${handle.id}`} className="relative flex items-center justify-end mb-1">
          <div className="text-[8px] text-muted-foreground pl-2 text-right">
            <div className="font-small leading-tight">
              {handle.label}
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={handle.id}
            className={`${getHandleColor('output')}`}
            style={{ 
              right: -10
            }}
            isValidConnection={isValidConnection}
          />
        </div>
      ))}
    </>
  );
}; 