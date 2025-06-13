"use client";
import React, { useMemo, useState, useCallback } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Panel,
    Node,
    Edge,
    NodeTypes,
    EdgeTypes,
    Connection,
    BackgroundVariant,
    ConnectionLineType,
    MarkerType,
    XYPosition,
} from "reactflow";
import QuickAccessPanel from "@/features/workflows/components/access-panel/QuickAccessPanel";
import { EdgeDetailOverlay } from "@/features/workflows/components/common/EdgeDetailOverlay";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { DbFunctionNode } from "@/features/workflows/types";

interface WorkflowCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: (changes: any) => void;
    onEdgesChange: (changes: any) => void;
    onConnect: (connection: Connection) => void;
    onNodeClick: (event: React.MouseEvent, node: Node) => void;
    nodeTypes: NodeTypes;
    edgeTypes: EdgeTypes;
    onAddNode: (id: string, type?: string) => void;
    onAddCustomNode: (id: string, type?: string) => Promise<{ nodeData: Omit<DbFunctionNode, "user_id">; position: XYPosition } | null | void>;
    onFinalizeNode: (configuredNodeData: Omit<DbFunctionNode, "user_id"> | DbFunctionNode, position: XYPosition) => void;
    mode?: "edit" | "view" | "execute";
    workflowId?: string;
    selectedEdge: Edge | null;
    isEdgeOverlayOpen: boolean;
    onCloseEdgeOverlay: () => void;
    onEdgeUpdated: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    nodeTypes,
    edgeTypes,
    onAddNode,
    onAddCustomNode,
    onFinalizeNode,
    mode = "edit",
    workflowId,
    selectedEdge,
    isEdgeOverlayOpen,
    onCloseEdgeOverlay,
    onEdgeUpdated,
}) => {
    const { mode: themeMode } = useTheme();

    // Default edge options - memoized to avoid recreating
    const defaultEdgeOptions = useMemo(
        () => ({
            animated: false,
            type: "virtual",
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: "hsl(var(--primary))",
            },
        }),
        []
    );

    return (
        <>
            <div className="flex-1 bg-background">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={defaultEdgeOptions}
                    connectionLineType={ConnectionLineType.SmoothStep}
                    fitView
                    fitViewOptions={{
                        padding: 0.2,
                        includeHiddenNodes: false,
                        minZoom: 0.1,
                        maxZoom: 1.5,
                    }}
                    minZoom={0.3}
                    maxZoom={2}
                    defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                    nodesDraggable={mode === "edit"}
                    nodesConnectable={mode === "edit"}
                    elementsSelectable={mode === "edit"}
                    edgesFocusable={mode === "edit"}
                >
                    <Controls position="bottom-left" showInteractive={false} />

                    <MiniMap
                        nodeColor={(node) => {
                            if (node.data?.type === "userInput") return "#10b981";
                            if (node.data?.type === "brokerRelay") return "#3b82f6";
                            if (node.data?.execution_required) return "#ef4444";
                            return themeMode === "dark" ? "#475569" : "#d1d5db";
                        }}
                        maskColor={themeMode === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(240, 240, 240, 0.4)"}
                        offsetScale={1}
                        pannable={true}
                        zoomable={true}
                        style={{
                            backgroundColor: themeMode === "dark" ? "#1e293b" : "#f9fafb",
                            border: themeMode === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
                            borderRadius: "0 0 8px 8px",
                        }}
                    />

                    {/* MiniMap Header - positioned above the MiniMap */}
                    <div 
                        className="fixed bottom-[150px] right-4 bg-gray-200 dark:bg-gray-700 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-t-lg border-b-0 shadow-lg"
                        style={{ width: 200, zIndex: 1000 }}
                    >
                        <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">Workflow Overview</h3>
                    </div>

                    <Background
                        gap={12}
                        size={1}
                        color={themeMode === "dark" ? "#334155" : "#e5e7eb"}
                        style={{ backgroundColor: themeMode === "dark" ? "#1e293b" : "#f9fafb" }}
                    />

                    {mode === "edit" && (
                        <Panel position="top-right">
                            <QuickAccessPanel onAddNode={onAddNode} onAddCustomNode={onAddCustomNode} onFinalizeNode={onFinalizeNode} />
                        </Panel>
                    )}

                    <svg style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0 }}>
                        <defs>
                            <marker
                                id="edge-circle"
                                viewBox="-5 -5 10 10"
                                refX="0"
                                refY="0"
                                markerUnits="strokeWidth"
                                markerWidth="10"
                                markerHeight="10"
                                orient="auto"
                            >
                                <circle stroke="hsl(var(--primary))" strokeOpacity="0.75" r="2" cx="0" cy="0" fill="hsl(var(--primary))" />
                            </marker>
                        </defs>
                    </svg>
                </ReactFlow>
            </div>

            {/* Edge Detail Overlay */}
            <EdgeDetailOverlay
                edge={selectedEdge}
                isOpen={isEdgeOverlayOpen}
                onClose={onCloseEdgeOverlay}
                onEdgeUpdated={onEdgeUpdated}
                workflowId={workflowId}
            />
        </>
    );
};

export default WorkflowCanvas;
