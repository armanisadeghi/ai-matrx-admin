"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { InputMapping, Output } from '@/lib/redux/workflow/types';
import { getHandleColor } from '../../utils/nodeStyles';

// Utility function to convert snake_case or camelCase to Title Case
const toTitleCase = (str: string): string => {
  return str
    // Handle snake_case: replace underscores with spaces
    .replace(/_/g, ' ')
    // Handle camelCase: insert space before uppercase letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter of each word
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
};

interface NodeHandlesProps {
  inputs?: InputMapping[];
  outputs?: Output[];
  isValidConnection?: (connection: any) => boolean;
}

export const NodeHandles: React.FC<NodeHandlesProps> = ({
  inputs = [],
  outputs = [],
  isValidConnection,
}) => {
  // Filter out inputs with type "arg_override"
  const filteredInputs = inputs.filter(input => input.type !== "arg_override");

  return (
    <>
      {/* Input handles */}
      {filteredInputs.map((input, index) => (
        <div key={`input-${index}`} className="relative flex items-center mb-1">
          <Handle
            type="target"
            position={Position.Left}
            id={input.arg_name}
            className={`${getHandleColor('input')}`}
            style={{ 
              left: -10
            }}
            isValidConnection={isValidConnection}
          />
          <div className="text-[8px] text-muted-foreground pr-2">
            <div className="font-small leading-tight">
              {toTitleCase(input.arg_name)}
            </div>
          </div>
        </div>
      ))}
      
      {/* Output handles */}
      {outputs.map((output, index) => (
        <div key={`output-${index}`} className="relative flex items-center justify-end mb-1">
          <div className="text-[8px] text-muted-foreground pl-2 text-right">
            <div className="font-small leading-tight">
              {toTitleCase(output.name)}
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={output.name}
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