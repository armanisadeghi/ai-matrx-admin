"use client";

import React, { useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { getHandleColor } from "../../utils/nodeStyles";
import { RegisteredNodeData } from "@/types/AutomationSchemaTypes";
import { toTitleCase } from "@/utils/dataUtils";

export type NodeInput = {
    id: string;
    name: string;
    required: boolean;
    component: string;
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
    compact?: boolean; // New prop to enable compact mode
    showOptional?: boolean; // Control whether to show optional inputs
}

export const NodeHandles: React.FC<NodeHandlesProps> = ({ nodeData, isValidConnection, compact = false, showOptional = true }) => {
    const nodeDefinition = nodeData?.metadata?.nodeDefinition;
    const inputHandles = useMemo(() => {
        const inputs = (nodeDefinition?.inputs || []) as NodeInput[];
        // Filter based on showOptional flag
        const filteredInputs = showOptional 
            ? inputs // Show all handles if showOptional is true
            : inputs.filter(input => input.required); // Show only required handles if showOptional is false
        
        return [...filteredInputs].sort((a, b) => {
            if (a.input_type === "broker" && b.input_type !== "broker") return -1;
            if (a.input_type !== "broker" && b.input_type === "broker") return 1;
            return 0;
        });
    }, [nodeDefinition, showOptional]);
    const outputHandles = useMemo(() => (nodeDefinition?.outputs || []) as NodeOutput[], [nodeDefinition]);

    // Compact mode: calculate positions around a circle
    const getCompactHandlePosition = (index: number, total: number, isInput: boolean) => {
        const radius = 32; // Half of the 64px (w-16 h-16) node size
        let angle: number;
        
        if (total === 1) {
            // Single handle: input on left, output on right
            angle = isInput ? Math.PI : 0;
        } else if (total === 2) {
            // Two handles: one on left, one on right
            angle = isInput ? Math.PI : 0;
        } else {
            // Multiple handles: distribute around the circle
            const inputCount = inputHandles.length;
            const outputCount = outputHandles.length;
            
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

    if (compact) {
        const totalHandles = inputHandles.length + outputHandles.length;
        
        return (
            <>
                {/* Compact Input handles */}
                {inputHandles.map((handle, index) => {
                    const { x, y, angle } = getCompactHandlePosition(index, totalHandles, true);
                    const position = getHandlePositionType(angle);
                    
                    return (
                        <Handle
                            key={`compact-input-${handle.id}`}
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
                
                {/* Compact Output handles */}
                {outputHandles.map((handle, index) => {
                    const globalIndex = inputHandles.length + index;
                    const { x, y, angle } = getCompactHandlePosition(globalIndex, totalHandles, false);
                    const position = getHandlePositionType(angle);
                    
                    return (
                        <Handle
                            key={`compact-output-${handle.broker_id}`}
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

    // Detailed mode (original rendering)
    return (
        <>
            {/* Input handles */}
            {inputHandles.map((handle, index) => (
                <div key={`input-${handle.id}`} className="relative flex items-center mb-1">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={`${handle.input_type}-${handle.id}`}
                        className={handle.required ? "!bg-amber-500 !border-amber-400 !w-2 !h-2" : "!bg-blue-500 !border-blue-400 !w-2 !h-2"}
                        style={{
                            left: -10,
                        }}
                        isValidConnection={isValidConnection}
                    />
                    <div className="text-[8px] text-muted-foreground pr-2">
                        <div className="font-small leading-tight">{toTitleCase(handle.name)}</div>
                    </div>
                </div>
            ))}

            {/* Output handles */}
            {outputHandles.map((handle, index) => (
                <div key={`output-${handle.broker_id}`} className="relative flex items-center justify-end mb-1">
                    <div className="text-[8px] text-muted-foreground pl-2 text-right">
                        <div className="font-small leading-tight">{toTitleCase(handle.name)}</div>
                    </div>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={`${handle.broker_id}`}
                        className="!bg-green-500 !border-green-400 !w-2 !h-2"
                        style={{
                            right: -10,
                        }}
                        isValidConnection={isValidConnection}
                    />
                </div>
            ))}
        </>
    );
};
