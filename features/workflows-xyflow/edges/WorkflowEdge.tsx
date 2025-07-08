"use client";
import React, { memo, useState } from "react";
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow, BaseEdge, EdgeMarker, useViewport } from "@xyflow/react";
import { Trash2, Settings, Zap } from "lucide-react";
import { EdgeSettingsOverlay } from "./EdgeSettingsOverlay";
import { useTheme } from "@/styles/themes/ThemeProvider";

interface WorkflowEdgeData extends Record<string, unknown> {
    label?: string;
    type?: "data" | "control" | "error" | "conditional";
    condition?: string;
    animated?: boolean;
    weight?: number;
    color?: string;
    // Workflow-specific data
    connectionType?: "direct_broker" | "source_input" | "relay" | "broker_relay" | "argument_mapping";
    sourceNode?: {
        id: string;
        step_name?: string;
        node_type?: string;
    };
    targetNode?: {
        id: string;
        step_name?: string;
        node_type?: string;
    };
    sourceOutput?: any;
    targetInput?: any;
    relay?: any;
    isTemporary?: boolean;
    createdAt?: string;
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
    const { deleteElements, setEdges } = useReactFlow();
    const { zoom } = useViewport();
    const { mode: themeMode } = useTheme();

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

    // Simple, professional edge styling
    const getEdgeStyle = () => {
        const animatedColor = themeMode === 'dark' ? "#60a5fa" : "#3b82f6"; // Light blue for dark mode, regular blue for light mode
        const staticColor = themeMode === 'dark' ? "#64748b" : "#64748b"; // Gray for both modes
        
        return {
            strokeWidth: selected ? 1.5 : 1,
            stroke: animated ? animatedColor : staticColor,
            strokeDasharray: animated ? "5,5" : "0",
            strokeDashoffset: animated ? "0" : undefined,
            animation: animated ? "dashflow 1s linear infinite" : undefined,
            // No zIndex here - let React Flow handle edge layering
            ...style,
        };
    };

    // Enhanced markers
    const getMarkerEnd = () => {
        return "url(#arrow)";
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
        setEdges((edges) =>
            edges.map((edge) =>
                edge.id === id
                    ? {
                          ...edge,
                          animated: !edge.animated,
                          data: { ...edge.data, animated: !edge.animated },
                      }
                    : edge
            )
        );
    };

    const edgeStyle = getEdgeStyle();
    const getToolbarScale = (zoom: number) => {
      if (zoom >= 1.0) {
        // When zoomed in (100% or more), keep normal size
        return 1;
      } else if (zoom >= 0.5) {
        // When zoomed out between 50-100%, scale proportionally but with a minimum
        return Math.max(0.8, zoom);
      } else {
        // When zoomed out below 50%, clamp to prevent excessive scaling
        return 0.8;
      }
    };
    
    return (
        <>
            {/* CSS Animation for dashed line */}
            <style>
                {`
                    @keyframes dashflow {
                        0% {
                            stroke-dashoffset: 0;
                        }
                        100% {
                            stroke-dashoffset: -10;
                        }
                    }
                `}
            </style>
            <BaseEdge path={edgePath} style={edgeStyle} markerEnd={getMarkerEnd()} markerStart={markerStart} />

            {/* Edge Controls and Label (only when selected) */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 10,
                        pointerEvents: "all",
                        zIndex: 1000, // Keep controls and labels on top
                    }}
                    className="nodrag nopan"
                >
                    {selected && (
                        <div className="flex flex-col items-center gap-1">
                            {/* Simple source name label (only when selected) */}
                            {data?.sourceNode?.step_name && (
                                <div className="text-[9px] text-gray-500 dark:text-gray-400 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-center border border-border shadow-sm">
                                    {data.sourceNode.step_name}
                                </div>
                            )}

                            {/* Controls (only when selected) - Fixed positioning with separate scale */}
                            <div
                                className="react-flow__node-toolbar flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
                                style={{
                                    transform: `scale(${getToolbarScale(zoom)})`,
                                    transformOrigin: "center",
                                    zIndex: 1000,
                                    position: "relative",
                                }}
                            >
                                <button
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-md text-xs h-6 w-6 p-0"
                                    onClick={handleSettings}
                                    title="Edge Settings"
                                >
                                    <Settings className="h-3 w-3" />
                                </button>
                                <button
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent rounded-md text-xs h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={handleDelete}
                                    title="Delete Edge"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                                <button
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground rounded-md text-xs h-6 w-6 p-0"
                                    onClick={handleToggleAnimation}
                                    title={animated ? "Disable Animation" : "Enable Animation"}
                                >
                                    <Zap className={`h-3 w-3 ${animated ? "text-yellow-500" : ""}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>

            {/* Edge Settings Overlay */}
            <EdgeSettingsOverlay isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} edge={completeEdge} />
        </>
    );
};

export const WorkflowEdge = memo(WorkflowEdgeComponent);
