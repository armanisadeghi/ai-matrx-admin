"use client";

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { InputMapping, Output } from '@/lib/redux/workflow/types';
import { getHandleColor } from '../../utils/nodeStyles';

interface CompactNodeHandlesProps {
  inputs?: InputMapping[];
  outputs?: Output[];
  isValidConnection?: (connection: any) => boolean;
}

export const CompactNodeHandles: React.FC<CompactNodeHandlesProps> = ({
  inputs = [],
  outputs = [],
  isValidConnection,
}) => {
  const totalHandles = inputs.length + outputs.length;
  const radius = 32; // Half of the 64px (w-16 h-16) node size
  
  // Calculate positions for handles around the circle
  const getHandlePosition = (index: number, total: number, isInput: boolean) => {
    // Start from top and distribute evenly around the circle
    // Inputs on the left side, outputs on the right side
    let angle: number;
    
    if (total === 1) {
      // Single handle: input on left, output on right
      angle = isInput ? Math.PI : 0;
    } else if (total === 2) {
      // Two handles: one on left, one on right
      angle = isInput ? Math.PI : 0;
    } else {
      // Multiple handles: distribute around the circle
      // Inputs take left half (-π/2 to π/2), outputs take right half
      const inputCount = inputs.length;
      const outputCount = outputs.length;
      
      if (isInput) {
        if (inputCount === 1) {
          angle = Math.PI; // Single input on the left
        } else {
          // Distribute inputs on left side (π/2 to 3π/2)
          const inputAngleStep = Math.PI / (inputCount + 1);
          angle = Math.PI / 2 + (index + 1) * inputAngleStep;
        }
      } else {
        if (outputCount === 1) {
          angle = 0; // Single output on the right
        } else {
          // Distribute outputs on right side (-π/2 to π/2)
          const outputAngleStep = Math.PI / (outputCount + 1);
          const outputIndex = index - inputCount;
          angle = -Math.PI / 2 + (outputIndex + 1) * outputAngleStep;
        }
      }
    }
    
    // Convert angle to x,y coordinates
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    return { x, y, angle };
  };

  // Determine handle position based on angle
  const getHandlePositionType = (angle: number): Position => {
    // Normalize angle to 0-2π
    const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    if (normalizedAngle >= 7 * Math.PI / 4 || normalizedAngle < Math.PI / 4) {
      return Position.Right;
    } else if (normalizedAngle >= Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) {
      return Position.Bottom;
    } else if (normalizedAngle >= 3 * Math.PI / 4 && normalizedAngle < 5 * Math.PI / 4) {
      return Position.Left;
    } else {
      return Position.Top;
    }
  };

  return (
    <>
      {/* Input handles */}
      {inputs.map((input, index) => {
        const { x, y, angle } = getHandlePosition(index, totalHandles, true);
        const position = getHandlePositionType(angle);
        
        return (
          <Handle
            key={`compact-input-${index}`}
            type="target"
            position={position}
            id={`input-${index}`}
            className={`!w-3 !h-3 !border-2 !border-white dark:!border-background ${getHandleColor('input')}`}
            style={{ 
              left: `calc(50% + ${x}px - 6px)`,
              top: `calc(50% + ${y}px - 6px)`,
            }}
            isValidConnection={isValidConnection}
          />
        );
      })}
      
      {/* Output handles */}
      {outputs.map((output, index) => {
        const globalIndex = inputs.length + index;
        const { x, y, angle } = getHandlePosition(globalIndex, totalHandles, false);
        const position = getHandlePositionType(angle);
        
        return (
          <Handle
            key={`compact-output-${index}`}
            type="source"
            position={position}
            id={`output-${index}`}
            className={`!w-3 !h-3 !border-2 !border-white dark:!border-background ${getHandleColor('output')}`}
            style={{ 
              left: `calc(50% + ${x}px - 6px)`,
              top: `calc(50% + ${y}px - 6px)`,
            }}
            isValidConnection={isValidConnection}
          />
        );
      })}
    </>
  );
}; 