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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SocketExecuteButton } from "@/components/socket-io/presets/SocketExecuteButton";
import WorkflowNode from "./nodes/WorkflowNode";
import NodeEditor from "./node-editor/NodeEditor";
import QuickAccessPanel from "./core/QuickAccessPanel";
import UserInputNode, { UserInputData } from "./nodes/UserInputNode";
import BrokerRelayNode, { BrokerRelayData } from "./nodes/BrokerRelayNode";
import UserInputEditor from "./nodes/UserInputEditor";
import BrokerRelayEditor from "./nodes/BrokerRelayEditor";
import DebugOverlay from "./core/DebugOverlay";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { BaseNode } from "@/features/workflows/types/backendTypes";
import { getNormalizedRegisteredFunctionNode, getRegisteredFunctionSelectOptions } from "@/features/workflows/utils.ts/node-utils";



// TypeScript declaration for window object
declare global {
    interface Window {
        workflowSystemRef?: {
            deleteNode: (nodeId: string) => void;
            editNode: (nodeData: any) => void;
            getUserInputs: () => { broker_id: string; value: string }[];
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

    // Get user inputs from the window object (will be set by the parent component)
    const userInputs = window.workflowSystemRef?.getUserInputs?.() || [];

    // Route to appropriate node component based on type
    if (data.type === 'userInput') {
        return <UserInputNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
    }
    
    if (data.type === 'brokerRelay') {
        return <BrokerRelayNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} />;
    }

    // Default to workflow node for registered functions
    return <WorkflowNode data={data} selected={selected} onDelete={handleDelete} onEdit={handleEdit} userInputs={userInputs} />;
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
            getUserInputs: () => {
                // Filter nodes to get only UserInputNodes and convert to the expected format
                return nodes
                    .map(node => node.data as UserInputData)
                    .filter(data => data.type === 'userInput')
                    .map(userInputData => ({
                        broker_id: userInputData.broker_id,
                        value: userInputData.value
                    }));
            },
        };

        return () => {
            delete window.workflowSystemRef;
        };
    }, [nodes]); // Add nodes dependency to update when nodes change

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
                broker_id: `ENTER_ACTUAL_BROKER_ID_HERE`,
                value: '',
                label: 'User Input',
                data_type: 'str' as const
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

    // Prepare workflow data for execution
    const prepareWorkflowData = () => {
        // Get all workflow nodes (filter out userInput and brokerRelay nodes)
        const workflowNodes = nodes
            .map(node => node.data)
            .filter(data => data && (!data.type || (data.type !== 'userInput' && data.type !== 'brokerRelay')))
            .filter(data => data.function_id); // Only include nodes with function_id

        // Get user inputs
        const userInputs = nodes
            .map(node => node.data as UserInputData)
            .filter(data => data && data.type === 'userInput' && data.broker_id)
            .map(userInputData => ({
                broker_id: userInputData.broker_id,
                value: userInputData.value || ""
            }));

        // Get broker relays
        const relays = nodes
            .map(node => node.data as BrokerRelayData)
            .filter(data => data && data.type === 'brokerRelay' && data.source)
            .map(relayData => ({
                source: relayData.source,
                targets: relayData.targets || []
            }));

        console.log('Preparing workflow data:', {
            workflowNodes: workflowNodes.length,
            userInputs: userInputs.length,
            relays: relays.length
        });

        return {
            nodes: workflowNodes,
            user_inputs: userInputs,
            relays: relays
        };
    };

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

                        {/* Execute Workflow Button - only show if we have workflow nodes */}
                        {nodes.some(node => node.data && (!node.data.type || (node.data.type !== 'userInput' && node.data.type !== 'brokerRelay')) && node.data.function_id) && (
                            <SocketExecuteButton
                                presetName="flow_nodes_to_start_workflow"
                                sourceData={prepareWorkflowData()}
                                buttonText="Execute Workflow"
                                variant="default"
                                size="sm"
                                overlayTitle="Execute Entire Workflow"
                                overlayDescription="Execute all workflow nodes in sequence with user inputs and relays"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            />
                        )}

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
