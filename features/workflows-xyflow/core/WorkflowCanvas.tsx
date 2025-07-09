"use client";

import React, { useCallback, useMemo, useEffect, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    Node,
    Edge,
    NodeTypes,
    EdgeTypes,
    BackgroundVariant,
    Viewport,
    useReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ConnectionMode,
    OnConnect,
    OnEdgesChange,
    OnNodesChange,
    OnSelectionChangeParams,
    NodeMouseHandler,
    EdgeMouseHandler,
    SelectionMode,
    useOnSelectionChange,
    useOnViewportChange,
    OnConnectStart,
    OnConnectEnd,
    OnReconnect,
} from "@xyflow/react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { WorkflowNodeItem } from "../nodes/wf-nodes/WorkflowNode";
import { UserInputSourceNode } from "../nodes/source-node/user-input/UserInputSourceNode";
import { UserDataSourceNode } from "../nodes/source-node/user-data/UserDataSourceNode";
import { WorkflowEdge } from "../edges/WorkflowEdge";
import { DirectInputNode } from "../nodes/custom-nodes/DirectInputNode";

import { getNodeMinimapColor } from "../utils/nodeStyles";
import QuickAccessPanel from "../access-panel/QuickAccessPanel";
import { WorkflowNode } from "@/lib/redux/workflow-nodes/types";
import { DefaultNode } from "../nodes/base/DefaultNode";
import { ArgMapping, InputConfig, Output, Relay } from "@/lib/redux/workflow/types";
import { useProcessConnection } from "../hooks/useProcessConnection";

interface WorkflowCanvasProps {
    workflowId: string;
    initialNodes: Node[];
    initialEdges: Edge[];
    initialViewport?: Viewport | null;
    mode: "edit" | "view" | "execute";
    onSelectionChange?: (selectedNodes: Node[], selectedEdges: Edge[]) => void;
    onNodeClick?: (node: Node) => void;
    onEdgeClick?: (edge: Edge) => void;
    onCanvasClick?: () => void;
    showGrid?: boolean;
    showMinimap?: boolean;
    showControls?: boolean;
    connectionMode?: ConnectionMode;
    selectionMode?: SelectionMode;
    onRecipeNodeCreated?: (nodeData: WorkflowNode) => void;
    handleSave?: () => void;
    onOpenSourceInputCreator?: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
    workflowId,
    initialNodes,
    initialEdges,
    initialViewport,
    mode,
    onSelectionChange,
    onNodeClick,
    onEdgeClick,
    onCanvasClick,
    showGrid = true,
    showMinimap = true,
    showControls = true,
    connectionMode = ConnectionMode.Strict,
    selectionMode = SelectionMode.Partial,
    onRecipeNodeCreated,
    handleSave,
    onOpenSourceInputCreator,
}) => {
    const reactFlowInstance = useReactFlow();

    // Use React Flow's built-in state management
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Selection state
    const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
    const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);

    // Viewport state
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

    // Only update on initial load, not when nodes are added/removed
    const [isInitialized, setIsInitialized] = useState(false);

    // Reset initialization when switching workflows (when all nodes change)
    useEffect(() => {
        if (isInitialized && initialNodes.length === 0) {
            setIsInitialized(false);
        }
    }, [initialNodes, isInitialized]);

    useEffect(() => {
        if (!isInitialized && initialNodes.length > 0) {
            setNodes(initialNodes);
            setIsInitialized(true);
        }
    }, [initialNodes, isInitialized, setNodes]);

    useEffect(() => {
        if (!isInitialized) {
            // Always set initial edges, even if empty (to clear any existing ones)
            setEdges(initialEdges);
        }
    }, [initialEdges, isInitialized, setEdges]);

    // Handle nodes being added/removed via Redux (without resetting the canvas)
    useEffect(() => {
        if (isInitialized) {
            const currentNodeIds = new Set(nodes.map((n) => n.id));
            const reduxNodeIds = new Set(initialNodes.map((n) => n.id));

            // Check for new nodes
            const newNodes = initialNodes.filter((n) => !currentNodeIds.has(n.id));

            // Check for removed nodes
            const removedNodeIds = nodes
                .filter((n) => !reduxNodeIds.has(n.id))
                .map((n) => n.id);

            if (newNodes.length > 0 || removedNodeIds.length > 0) {
                // Update nodes: remove deleted ones and add new ones
                setNodes((currentNodes) => {
                    // Clear selection from existing nodes when new nodes are added
                    const filteredNodes = currentNodes
                        .filter((n) => !removedNodeIds.includes(n.id))
                        .map((n) => ({ ...n, selected: newNodes.length > 0 ? false : n.selected }));

                    // Ensure new nodes have higher z-index than existing ones
                    const maxZIndex = Math.max(0, ...filteredNodes.map((n) => n.zIndex || 0));
                    const nodesWithZIndex = newNodes.map((node, index) => ({
                        ...node,
                        zIndex: maxZIndex + index + 1,
                        selected: true, // Auto-select new nodes for better UX
                    }));

                    return [...filteredNodes, ...nodesWithZIndex];
                });
            }
        }
    }, [initialNodes, nodes, isInitialized, setNodes]);

    // Handle edges being added/removed via Redux (without resetting the canvas)
    useEffect(() => {
        if (isInitialized) {
            const currentEdgeIds = new Set(edges.map((e) => e.id));
            const reduxEdgeIds = new Set(initialEdges.map((e) => e.id));

            // Check for new edges from Redux
            const newReduxEdges = initialEdges.filter((e) => !currentEdgeIds.has(e.id));

            // Only remove edges that were managed by Redux (not temporary React Flow edges)
            const removedReduxEdgeIds = edges.filter((e) => !reduxEdgeIds.has(e.id) && !e.data?.isTemporary).map((e) => e.id);

            if (newReduxEdges.length > 0 || removedReduxEdgeIds.length > 0) {
                // Update edges: remove deleted ones and add new ones
                setEdges((currentEdges) => {
                    const filteredEdges = currentEdges.filter((e) => !removedReduxEdgeIds.includes(e.id));
                    return [...filteredEdges, ...newReduxEdges];
                });
            }
        }
    }, [initialEdges, edges, isInitialized, setEdges]);

    // Set initial viewport
    useEffect(() => {
        if (
            initialViewport &&
            typeof initialViewport.x === "number" &&
            typeof initialViewport.y === "number" &&
            typeof initialViewport.zoom === "number" &&
            !isNaN(initialViewport.x) &&
            !isNaN(initialViewport.y) &&
            !isNaN(initialViewport.zoom) &&
            initialViewport.zoom > 0
        ) {
            reactFlowInstance.setViewport(initialViewport, { duration: 300 });
            setViewport(initialViewport);
        }
    }, [initialViewport, reactFlowInstance]);

    // Get current theme
    const currentTheme = useSelector((state: RootState) => state.theme.mode);

    // Enhanced node types with better performance
    const nodeTypes: NodeTypes = useMemo(
        () => ({
            default: DefaultNode,
            directInput: DirectInputNode,
            functionNode: WorkflowNodeItem,
            workflowNode: WorkflowNodeItem,

            userInput: UserInputSourceNode,
            userDataSource: UserDataSourceNode,
        }),
        []
    );

    // Enhanced edge types
    const edgeTypes: EdgeTypes = useMemo(
        () => ({
            default: WorkflowEdge,
            workflow: WorkflowEdge,
            smoothstep: WorkflowEdge,
        }),
        []
    );

    // Enhanced default edge options
    const defaultEdgeOptions = useMemo(
        () => ({
            animated: false,
            type: "default",
            style: {
                strokeWidth: 2,
                stroke: currentTheme === "dark" ? "#6b7280" : "#374151",
            },
        }),
        [currentTheme]
    );

    const { handleProcessConnection } = useProcessConnection({ workflowId, handleSave });


    // Enhanced connection validation
    const isValidConnection = useCallback(
        (connection: Connection) => {
            const { source, target, sourceHandle, targetHandle } = connection;

            // Prevent self-connections
            if (source === target) {
                return false;
            }

            // Check if connection already exists
            const existingConnection = edges.find(
                (edge) =>
                    edge.source === source &&
                    edge.target === target &&
                    edge.sourceHandle === sourceHandle &&
                    edge.targetHandle === targetHandle
            );

            if (existingConnection) {
                return false;
            }

            // Custom validation based on node types
            const sourceNode = nodes.find((node) => node.id === source);
            const targetNode = nodes.find((node) => node.id === target);

            if (!sourceNode || !targetNode) {
                return false;
            }

            return true;
        },
        [edges, nodes]
    );


    const handleConnect: OnConnect = useCallback(
        (connection) => {
            console.log(JSON.stringify(connection, null, 2));
        
            if (isValidConnection(connection)) {
                
                const connectionData = handleProcessConnection(connection);
                
                const newEdge: Edge = {
                    id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
                    source: connection.source!,
                    target: connection.target!,
                    sourceHandle: connection.sourceHandle,
                    targetHandle: connection.targetHandle,
                    type: "smoothstep",
                    animated: false,
                    style: {
                        strokeWidth: 2,
                        stroke: currentTheme === "dark" ? "#6b7280" : "#374151",
                    },
                    data: {
                        ...connectionData,
                        isTemporary: true, // Mark as temporary until backend is implemented
                        createdAt: new Date().toISOString(),
                    },
                };
                setEdges((eds) => [...eds, newEdge]);
            } else {
                console.log('❌ Connection rejected - validation failed');
            }
        },
        [setEdges, isValidConnection, currentTheme, nodes, handleProcessConnection]
    );


    const handleReconnect: OnReconnect = useCallback((oldEdge, newConnection) => {
        if (isValidConnection(newConnection)) {
            console.log('✅ Reconnecting edge');
            setEdges((eds) => eds.map((edge) => 
                edge.id === oldEdge.id 
                    ? { 
                        ...edge, 
                        source: newConnection.source!,
                        target: newConnection.target!,
                        sourceHandle: newConnection.sourceHandle,
                        targetHandle: newConnection.targetHandle,
                    }
                    : edge
            ));
        } else {
            console.log('❌ Reconnection rejected - validation failed');
        }
    }, [isValidConnection, setEdges]);

    // Enhanced event handlers
    const handleNodesChange: OnNodesChange = useCallback(
        (changes) => {
            onNodesChange(changes);
        },
        [onNodesChange]
    );

    const handleEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            onEdgesChange(changes);
        },
        [onEdgesChange]
    );

    // Selection change handler
    const handleSelectionChange = useCallback(
        (params: OnSelectionChangeParams) => {
            setSelectedNodes(params.nodes);
            setSelectedEdges(params.edges);
            onSelectionChange?.(params.nodes, params.edges);
        },
        [onSelectionChange]
    );

    // Use React Flow's selection change hook
    useOnSelectionChange({
        onChange: handleSelectionChange,
    });

    // Viewport change handler
    const handleViewportChange = useCallback((newViewport: Viewport) => {
        setViewport(newViewport);
    }, []);

    useOnViewportChange({
        onChange: handleViewportChange,
    });

    // Enhanced node click handler
    const handleNodeClick: NodeMouseHandler = useCallback(
        (event, node) => {
            event.stopPropagation();
            onNodeClick?.(node);
        },
        [onNodeClick]
    );

    // Enhanced edge click handler
    const handleEdgeClick: EdgeMouseHandler = useCallback(
        (event, edge) => {
            event.stopPropagation();
            onEdgeClick?.(edge);
        },
        [onEdgeClick]
    );

    // Pane click handler
    const handlePaneClick = useCallback(
        (event: React.MouseEvent) => {
            onCanvasClick?.();
        },
        [onCanvasClick]
    );

    const isInteractive = mode === "edit";

    // Determine if we should fit view - when no valid viewport exists
    const shouldFitView =
        !initialViewport ||
        typeof initialViewport.x !== "number" ||
        typeof initialViewport.y !== "number" ||
        typeof initialViewport.zoom !== "number" ||
        isNaN(initialViewport.x) ||
        isNaN(initialViewport.y) ||
        isNaN(initialViewport.zoom) ||
        initialViewport.zoom <= 0;

    return (
        <div className="flex-1 bg-background relative">
            {/* Status Panel */}
            <Panel position="top-right" className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
                <div className="text-xs text-muted-foreground">
                    <div>Nodes: {nodes.length}</div>
                    <div>Edges: {edges.length}</div>
                    <div>Selected: {selectedNodes.length + selectedEdges.length}</div>
                    <div>Zoom: {Math.round(viewport.zoom * 100)}%</div>
                </div>
            </Panel>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                onReconnect={handleReconnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                colorMode={currentTheme}
                fitView={shouldFitView}
                fitViewOptions={{
                    padding: 0.2,
                    includeHiddenNodes: false,
                    maxZoom: 1.5, // Limit auto-fit zoom to 150%
                }}
                attributionPosition="bottom-left"
                nodesDraggable={isInteractive}
                nodesConnectable={isInteractive}
                nodesFocusable={isInteractive}
                edgesFocusable={isInteractive}
                edgesReconnectable={isInteractive}
                elementsSelectable={isInteractive}
                selectNodesOnDrag={isInteractive}
                panOnDrag={true}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                deleteKeyCode={isInteractive ? "Delete" : null}
                selectionKeyCode={isInteractive ? "Shift" : null}
                multiSelectionKeyCode={isInteractive ? "Meta" : null}
                connectionMode={connectionMode}
                selectionMode={selectionMode}
                onlyRenderVisibleElements={true}
                className="bg-background"
                isValidConnection={isValidConnection}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                onSelectionChange={handleSelectionChange}
                minZoom={0.1}
                maxZoom={4}
                translateExtent={[
                    [-5000, -5000],
                    [5000, 5000],
                ]}
                nodeExtent={[
                    [-5000, -5000],
                    [5000, 5000],
                ]}
            >
                {showGrid && (
                    <Background
                        gap={12}
                        size={1}
                        color={currentTheme === "dark" ? "#334155" : "#e5e7eb"}
                        style={{ backgroundColor: currentTheme === "dark" ? "#1e293b" : "#f9fafb" }}
                    />
                )}

                {showControls && (
                    <Controls
                        position="bottom-right"
                        className="bg-background border border-border rounded-lg shadow-lg"
                        showInteractive={false}
                        showZoom={true}
                        showFitView={true}
                        fitViewOptions={{ duration: 800, padding: 0.2, maxZoom: 1.5 }}
                    />
                )}

                {showMinimap && (
                    <MiniMap
                        position="bottom-left"
                        className="bg-background border border-border rounded-lg shadow-lg"
                        maskColor={currentTheme === "dark" ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.6)"}
                        nodeColor={getNodeMinimapColor(currentTheme)}
                        zoomable
                        pannable
                        nodeStrokeWidth={2}
                        nodeStrokeColor={currentTheme === "dark" ? "#374151" : "#d1d5db"}
                    />
                )}

                {mode === "edit" && (
                    <Panel position="top-left" className="p-0">
                        <QuickAccessPanel 
                            workflowId={workflowId} 
                            onRecipeNodeCreated={onRecipeNodeCreated}
                            onOpenSourceInputCreator={onOpenSourceInputCreator}
                        />
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
};
WorkflowCanvas.displayName = "WorkflowCanvas";

