"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { InputMapping, Output } from '@/lib/redux/workflow/types';
import { getHandleColor } from '../../utils/nodeStyles';
import { toTitleCase } from '@/utils/dataUtils';


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
  // Filter out inputs with type "arg_override" and null/undefined arg_name
  const filteredInputs = inputs.filter(input => 
    input.type !== "arg_override" && 
    input.arg_name != null && 
    input.arg_name !== ''
  );

  // Filter out outputs with null/undefined names
  const filteredOutputs = outputs.filter(output => 
    output.name != null && 
    output.name !== ''
  );

  return (
    <>
      {/* Input handles */}
      {filteredInputs.map((input, index) => (
        <div key={`input-${index}`} className="relative flex items-center mb-1">
          <Handle
            type="target"
            position={Position.Left}
            id={input.arg_name!} // Safe to use ! here since we filtered out null values
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
      {filteredOutputs.map((output, index) => (
        <div key={`output-${index}`} className="relative flex items-center justify-end mb-1">
          <div className="text-[8px] text-muted-foreground pl-2 text-right">
            <div className="font-small leading-tight">
              {toTitleCase(output.name)}
            </div>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id={output.name!} // Safe to use ! here since we filtered out null values
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