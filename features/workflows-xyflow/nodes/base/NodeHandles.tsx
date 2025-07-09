"use client";

import React, { useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { toTitleCase } from "@/utils/dataUtils";
import { getCompactHandlePosition, getHandlePositionType } from "@/features/workflows-xyflow/utils/handle-position";

export type NodeInput = {
    id: string;
    name: string;
    required: boolean;
    component: string;
    options?: Array<{
        value: string;
        label: string;
    }>;
    data_type: string;
    input_type: string;
};

export type NodeOutput = {
    name: string;
    broker_id: string;
    component: string;
    data_type: string;
    description: string | null;
    output_type: string;
};

export interface InputHandle extends NodeInput {
    id: string;
    metadata?: Record<string, any>;
}

export interface OutputHandle extends NodeOutput {
    id: string;
    metadata?: Record<string, any>;
}

export interface NodeHandlesProps {
    nodeData: any;
    isValidConnection?: (connection: any) => boolean;
    compact?: boolean;
    showOptional?: boolean;
}

export const NodeHandles: React.FC<NodeHandlesProps> = ({ nodeData, isValidConnection, compact = false, showOptional = true }) => {
    const nodeDefinition = nodeData?.metadata?.nodeDefinition;
    
    const inputHandles = useMemo(() => {
        const inputs = (nodeDefinition?.inputs || []) as NodeInput[];
        const filteredInputs = showOptional ? inputs : inputs.filter(input => input.required);
        
        return [...filteredInputs].sort((a, b) => {
            if (a.input_type === "broker" && b.input_type !== "broker") return -1;
            if (a.input_type !== "broker" && b.input_type === "broker") return 1;
            return 0;
        });
    }, [nodeDefinition, showOptional]);
    
    const outputHandles = useMemo(() => (nodeDefinition?.outputs || []) as NodeOutput[], [nodeDefinition]);

    if (compact) {
        const totalHandles = inputHandles.length + outputHandles.length;
        
        return (
            <>
                {inputHandles.map((handle, index) => {
                    const { x, y, angle } = getCompactHandlePosition(index, totalHandles, true, inputHandles.length, outputHandles.length);
                    const position = getHandlePositionType(angle);
                    
                    return (
                        <Handle
                            key={`compact-input-${handle.id}-${index}`}
                            type="target"
                            position={position}
                            id={`${handle.input_type}-${handle.id}`}
                            className={`!w-3 !h-3 !border-2 !border-white dark:!border-background ${
                                handle.required ? "!bg-amber-500 !border-amber-400" : "!bg-blue-500 !border-blue-400"
                            }`}
                            style={{ 
                                left: `calc(50% + ${x}px - 6px)`,
                                top: `calc(50% + ${y}px - 6px)`,
                            }}
                            isValidConnection={isValidConnection}
                        />
                    );
                })}
                
                {outputHandles.map((handle, index) => {
                    const globalIndex = inputHandles.length + index;
                    const { x, y, angle } = getCompactHandlePosition(globalIndex, totalHandles, false, inputHandles.length, outputHandles.length);
                    const position = getHandlePositionType(angle);
                    
                    return (
                        <Handle
                            key={`compact-output-${handle.broker_id}-${index}`}
                            type="source"
                            position={position}
                            id={`${handle.broker_id}`}
                            className="!w-3 !h-3 !border-2 !border-white dark:!border-background !bg-green-500 !border-green-400"
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
    }

    return (
        <>
            {inputHandles.map((handle, index) => (
                <div key={`input-${handle.id}-${index}`} className="relative flex items-center mb-1">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={`${handle.input_type}-${handle.id}`}
                        className={handle.required ? "!bg-amber-500 !border-amber-400 !w-2 !h-2" : "!bg-blue-500 !border-blue-400 !w-2 !h-2"}
                        style={{ left: -10 }}
                        isValidConnection={isValidConnection}
                    />
                    <div className="text-[8px] text-muted-foreground pr-2">
                        <div className="font-small leading-tight">{toTitleCase(handle.name)}</div>
                    </div>
                </div>
            ))}

            {outputHandles.map((handle, index) => (
                <div key={`output-${handle.broker_id}-${index}`} className="relative flex items-center justify-end mb-1">
                    <div className="text-[8px] text-muted-foreground pl-2 text-right">
                        <div className="font-small leading-tight">{toTitleCase(handle.name)}</div>
                    </div>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={`${handle.broker_id}`}
                        className="!bg-green-500 !border-green-400 !w-2 !h-2"
                        style={{ right: -10 }}
                        isValidConnection={isValidConnection}
                    />
                </div>
            ))}
        </>
    );
};