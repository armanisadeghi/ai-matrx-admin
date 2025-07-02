import { Edge, MarkerType } from '@xyflow/react';
import { InputMapping, Output } from '@/lib/redux/workflow/types';

// For now, edges are derived from node connections
// Later we might want a separate edge entity

export interface EdgeData {
  sourceOutput?: Output;
  targetInput?: InputMapping;
  label?: string;
  metadata?: Record<string, any>;
  [key: string]: unknown;
}

// Convert edge data to React Flow Edge format
export const edgeToReactFlow = (
  sourceNodeId: string,
  targetNodeId: string,
  sourceOutput: Output,
  targetInput: InputMapping,
  index: number
): Edge => {
  return {
    id: `${sourceNodeId}-${targetNodeId}-${index}`,
    source: sourceNodeId,
    target: targetNodeId,
    sourceHandle: `output-${index}`,
    targetHandle: `input-${index}`,
    type: 'default',
    animated: false,
    data: {
      sourceOutput,
      targetInput,
      label: generateEdgeLabel(sourceOutput, targetInput),
      metadata: {}
    } as EdgeData,
    style: {
      stroke: getEdgeColor(sourceOutput, targetInput),
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
  };
};

// Convert React Flow Edge back to connection data
export const reactFlowToEdge = (edge: Edge) => {
  const data = edge.data as EdgeData;
  return {
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceOutput: data.sourceOutput,
    targetInput: data.targetInput,
    metadata: data.metadata || {},
  };
};

// Generate a label for the edge based on the connection
const generateEdgeLabel = (sourceOutput?: Output, targetInput?: InputMapping): string => {
  if (sourceOutput?.name && targetInput?.arg_name) {
    return `${sourceOutput.name} → ${targetInput.arg_name}`;
  }
  if (sourceOutput?.data_type) {
    return sourceOutput.data_type;
  }
  return '';
};

// Get edge color based on data type or connection type
const getEdgeColor = (sourceOutput?: Output, targetInput?: InputMapping): string => {
  if (sourceOutput?.data_type) {
    switch (sourceOutput.data_type.toLowerCase()) {
      case 'string':
      case 'text':
        return '#10b981'; // green
      case 'number':
      case 'integer':
      case 'float':
        return '#3b82f6'; // blue
      case 'boolean':
        return '#f59e0b'; // amber
      case 'object':
      case 'json':
        return '#8b5cf6'; // violet
      case 'array':
        return '#ec4899'; // pink
      default:
        return '#6b7280'; // gray
    }
  }
  return '#6b7280'; // default gray
};

// Helper to validate edge connection
export const validateConnection = (
  sourceOutput?: Output,
  targetInput?: InputMapping
): { valid: boolean; reason?: string } => {
  if (!sourceOutput || !targetInput) {
    return { valid: false, reason: 'Missing source output or target input' };
  }

  // Check data type compatibility
  if (sourceOutput.data_type && targetInput.type) {
    if (sourceOutput.data_type !== targetInput.type) {
      // Allow some flexible type matching
      const compatibleTypes = {
        'string': ['text', 'any'],
        'text': ['string', 'any'],
        'number': ['integer', 'float', 'any'],
        'integer': ['number', 'float', 'any'],
        'float': ['number', 'integer', 'any'],
        'any': ['string', 'text', 'number', 'integer', 'float', 'boolean', 'object', 'array']
      };

      const sourceType = sourceOutput.data_type.toLowerCase();
      const targetType = targetInput.type.toLowerCase();
      
      if (!compatibleTypes[sourceType]?.includes(targetType)) {
        return { 
          valid: false, 
          reason: `Type mismatch: ${sourceOutput.data_type} cannot connect to ${targetInput.type}` 
        };
      }
    }
  }

  return { valid: true };
};

// Helper to create edge style based on validation
export const getEdgeStyle = (
  sourceOutput?: Output,
  targetInput?: InputMapping,
  isValid: boolean = true
) => {
  const baseStyle = {
    strokeWidth: 2,
    stroke: isValid ? getEdgeColor(sourceOutput, targetInput) : '#ef4444', // red for invalid
  };

  if (!isValid) {
    return {
      ...baseStyle,
      strokeDasharray: '5,5', // dashed line for invalid connections
    };
  }

  return baseStyle;
}; 