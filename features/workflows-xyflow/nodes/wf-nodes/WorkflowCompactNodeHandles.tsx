"use client";

import React from 'react';
import { InputMapping, Output } from '@/lib/redux/workflow/types';
import { CompactNodeHandles } from '../handles/CompactNodeHandles';
import { NodeHandle } from '../handles/NodeHandles';
import { toTitleCase } from '@/utils/dataUtils';

interface WorkflowCompactNodeHandlesProps {
  /** Node ID for generating unique handle IDs */
  nodeId: string;
  /** Workflow input mappings */
  inputs?: InputMapping[];
  /** Workflow outputs */
  outputs?: Output[];
  /** Optional validation function for connections */
  isValidConnection?: (connection: any) => boolean;
}

export const WorkflowCompactNodeHandles: React.FC<WorkflowCompactNodeHandlesProps> = ({
  nodeId,
  inputs = [],
  outputs = [],
  isValidConnection,
}) => {
  // Process inputs into generic handle format
  const inputHandles: NodeHandle[] = React.useMemo(() => {
    return inputs
      .filter(input => 
        input.type !== "arg_override" && 
        input.arg_name != null && 
        input.arg_name !== ''
      )
      .map((input, index) => ({
        id: `${nodeId}-input-${input.arg_name}`,
        label: toTitleCase(input.arg_name!),
        metadata: {
          type: input.type,
          source_broker_id: input.source_broker_id,
          default_value: input.default_value,
          ready: input.ready,
          ...input.metadata
        }
      }));
  }, [nodeId, inputs]);

  // Process outputs into generic handle format
  const outputHandles: NodeHandle[] = React.useMemo(() => {
    return outputs
      .filter(output => 
        output.name != null && 
        output.name !== ''
      )
      .map((output, index) => ({
        id: `${nodeId}-output-${output.name}`,
        label: toTitleCase(output.name!),
        metadata: {
          broker_id: output.broker_id,
          is_default_output: output.is_default_output,
          data_type: output.data_type,
          bookmark: output.bookmark,
          conversion: output.conversion,
          result: output.result,
          relays: output.relays,
          ...output.metadata
        }
      }));
  }, [nodeId, outputs]);

  return (
    <CompactNodeHandles
      inputHandles={inputHandles}
      outputHandles={outputHandles}
      isValidConnection={isValidConnection}
    />
  );
}; 