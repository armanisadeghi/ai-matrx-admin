"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    Panel,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    ConnectionLineType,
    MarkerType,
    useReactFlow,
    ReactFlowProvider,
    NodeTypes,
    BackgroundVariant,
    Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { BaseNode, getNormalizedRegisteredFunctionNode, getRegisteredFunctionSelectOptions } from "../constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Trash2 } from "lucide-react";
import WorkflowNode from "./WorkflowNode";
import NodeEditor from "./NodeEditor";
import QuickAccessPanel from "./QuickAccessPanel";
import UserInputNode, { UserInputData } from "./UserInputNode";
import BrokerRelayNode, { BrokerRelayData } from "./BrokerRelayNode";
import UserInputEditor from "./UserInputEditor";
import BrokerRelayEditor from "./BrokerRelayEditor";
import DebugOverlay from "./DebugOverlay";
import { useTheme } from "@/styles/themes/ThemeProvider";

// TypeScript declaration for window object
declare global {
    interface Window {
        workflowSystemRef?: {
            deleteNode: (nodeId: string) => void;
            editNode: (nodeData: any) => void;
        };
    }
}

// Custom Node Component Wrapper
const WorkflowNodeWrapper = ({ data, selected }: { data: any; selected: boolean }) => {
    // Access the parent component's methods through React context or global state
    // For now, we'll use a more direct approach by accessing the methods from the window object
    const handleDelete = (nodeId: string) => {
        if (window.workflowSystemRef?.deleteNode) {
            window.workflowSystemRef.deleteNode(nodeId);
        }
    };

    const handleEdit = (nodeData: any) => {
        if (window.workflowSystemRef?.editNode) {
            window.workflowSystemRef.editNode(nodeData);
        }
    };

    // Route to appropriate node component based on type
    if (data.type === 'userInput') {
        return <UserInputNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
    }
    
    if (data.type === 'brokerRelay') {
        return <BrokerRelayNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
    }

    // Default to workflow node for registered functions
    return <WorkflowNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
};

// Main Workflow System Component
const WorkflowSystem = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [editingNode, setEditingNode] = useState<BaseNode | UserInputData | BrokerRelayData | null>(null);
    const [selectedFunction, setSelectedFunction] = useState<string>("");
    const { mode } = useTheme();

    const nodeTypes: NodeTypes = useMemo(
        () => ({
            workflowNode: WorkflowNodeWrapper,
        }),
        []
    );

    // Expose methods to the wrapper component
    useEffect(() => {
        window.workflowSystemRef = {
            deleteNode,
            editNode: (nodeData: any) => setEditingNode(nodeData),
        };

        return () => {
            delete window.workflowSystemRef;
        };
    }, []);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    // Auto-add node when function is selected
    const handleFunctionSelect = (functionId: string) => {
        if (!functionId) {
            setSelectedFunction("");
            return;
        }

        try {
            const baseNode = getNormalizedRegisteredFunctionNode(functionId);
            const newNode: Node = {
                id: baseNode.id,
                type: "workflowNode",
                position: {
                    x: Math.random() * 300 + 100,
                    y: Math.random() * 300 + 100,
                },
                data: baseNode,
            };

            setNodes((nds) => nds.concat(newNode));
            setSelectedFunction(""); // Reset selection after adding
        } catch (error) {
            console.error("Error adding node:", error);
        }
    };

    // Generate unique ID
    const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const handleAddNode = (id: string, type?: string) => {
        if (type === "registeredFunction") {
            handleFunctionSelect(id);
        } else if (type === "userInput") {
            // Create a new User Input node
            const newUserInputData: UserInputData = {
                id: generateId(),
                type: 'userInput',
                broker_id: `user_input_${Date.now()}`,
                value: '',
                label: 'User Input',
                data_type: 'string'
            };

            const newNode: Node = {
                id: newUserInputData.id,
                type: "workflowNode",
                position: {
                    x: Math.random() * 300 + 100,
                    y: Math.random() * 300 + 100,
                },
                data: newUserInputData,
            };

            setNodes((nds) => nds.concat(newNode));
        } else if (type === "brokerRelay") {
            // Create a new Broker Relay node
            const newBrokerRelayData: BrokerRelayData = {
                id: generateId(),
                type: 'brokerRelay',
                source: '',
                targets: [],
                label: 'Broker Relay'
            };

            const newNode: Node = {
                id: newBrokerRelayData.id,
                type: "workflowNode",
                position: {
                    x: Math.random() * 300 + 100,
                    y: Math.random() * 300 + 100,
                },
                data: newBrokerRelayData,
            };

            setNodes((nds) => nds.concat(newNode));
        } else {
            console.log(`Node type "${type}" is not implemented yet`);
        }
    };

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        // Prevent opening editor if right-clicking (for context menu)
        if (event.button === 2) return;
        setEditingNode(node.data as BaseNode | UserInputData | BrokerRelayData);
    }, []);

    const deleteNode = useCallback(
        (nodeId: string) => {
            setNodes((nds) => nds.filter((node) => node.id !== nodeId));
            setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        },
        [setNodes, setEdges]
    );

    const handleNodeSave = (updatedNode: BaseNode | UserInputData | BrokerRelayData) => {
        setNodes((nds) => nds.map((node) => (node.id === updatedNode.id ? { ...node, data: updatedNode } : node)));
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Delete" || event.key === "Backspace") {
                // Delete selected nodes (you'd need to track selection state for this)
                // For now, we'll rely on the context menu
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const functionOptions = getRegisteredFunctionSelectOptions();

    return (
        <div className="h-screen w-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="border-b bg-card p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-foreground">Workflow Builder</h1>

                    <div className="flex items-center gap-3">
                        <Select value={selectedFunction} onValueChange={handleFunctionSelect}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Select a function to add..." />
                            </SelectTrigger>
                            <SelectContent>
                                {functionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DebugOverlay nodes={nodes} edges={edges} />

                        <div className="text-sm text-muted-foreground">
                            {nodes.length} node{nodes.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 bg-background">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    className="bg-background"
                >
                    <Controls
                        className={mode === "dark" ? "react-flow-controls-dark" : ""}
                        position="bottom-left"
                        showInteractive={false}
                        style={{ bottom: 10, left: 10 }}
                    />
                    <MiniMap
                        className={mode === "dark" ? "react-flow-minimap-dark" : ""}
                        nodeColor={(node) => {
                            // Color nodes based on their data type
                            if (node.data?.type === 'userInput') return "#10b981"; // emerald
                            if (node.data?.type === 'brokerRelay') return "#3b82f6"; // blue
                            if (node.data?.execution_required) return "#ef4444"; // red
                            return mode === "dark" ? "#475569" : "#d1d5db"; // gray
                        }}
                        maskColor={mode === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(240, 240, 240, 0.4)"}
                        style={{
                            backgroundColor: mode === "dark" ? "#1e293b" : "#f9fafb",
                            border: mode === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
                        }}
                    />
                    <Background
                        gap={12}
                        size={1}
                        color={mode === "dark" ? "#334155" : "#e5e7eb"}
                        style={{ backgroundColor: mode === "dark" ? "#1e293b" : "#f9fafb" }}
                    />

                    {/* Quick access node creation panel - Using our new component */}
                    <Panel position="top-right">
                        <QuickAccessPanel onAddNode={handleAddNode} />
                    </Panel>
                </ReactFlow>
            </div>

            {/* Node Editor Modal - Now handles different node types */}
            {editingNode && (
                ('type' in editingNode && editingNode.type === 'userInput') ? (
                    <UserInputEditor 
                        node={editingNode as UserInputData} 
                        onSave={handleNodeSave} 
                        onClose={() => setEditingNode(null)} 
                        open={!!editingNode} 
                    />
                ) : ('type' in editingNode && editingNode.type === 'brokerRelay') ? (
                    <BrokerRelayEditor 
                        node={editingNode as BrokerRelayData} 
                        onSave={handleNodeSave} 
                        onClose={() => setEditingNode(null)} 
                        open={!!editingNode} 
                    />
                ) : (
                    <NodeEditor 
                        node={editingNode as BaseNode} 
                        onSave={handleNodeSave} 
                        onClose={() => setEditingNode(null)} 
                        open={!!editingNode} 
                    />
                )
            )}
        </div>
    );
};

export default WorkflowSystem;
