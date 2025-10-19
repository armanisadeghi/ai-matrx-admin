"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    X,
    Plus,
    ChevronRight,
    ChevronDown,
    Play,
    Save,
    Upload,
    Download,
    Settings,
    User,
    Database,
    Workflow,
    Circle,
    ArrowRight,
    GitBranch,
    Check,
    ArrowBigRight,
    FileDown,
    AlertCircle,
    MoreHorizontal,
    Search,
    Trash2,
    Move,
    Layers,
    PlusCircle,
} from "lucide-react";

// This would be your actual workflow components
const MOCK_ACTION_TYPES = [
    {
        id: "process_data",
        name: "Process Data",
        category: "Data",
        description: "Process data using specified algorithm",
        inputs: [
            { name: "data", type: "object", required: true },
            { name: "algorithm", type: "string", required: true },
        ],
        outputs: [
            { name: "processed_data", type: "object" },
            { name: "stats", type: "object" },
        ],
    },
    {
        id: "send_email",
        name: "Send Email",
        category: "Communication",
        description: "Send an email with customizable content",
        inputs: [
            { name: "recipient", type: "string", required: true },
            { name: "subject", type: "string", required: true },
            { name: "body", type: "string", required: true },
        ],
        outputs: [
            { name: "status", type: "string" },
            { name: "delivered_at", type: "datetime" },
        ],
    },
    {
        id: "analyze_sentiment",
        name: "Analyze Sentiment",
        category: "AI",
        description: "Analyze text sentiment using NLP",
        inputs: [
            { name: "text", type: "string", required: true },
            { name: "language", type: "string", required: false },
        ],
        outputs: [
            { name: "sentiment", type: "string" },
            { name: "confidence", type: "number" },
            { name: "entities", type: "array" },
        ],
    },
    {
        id: "fetch_data",
        name: "Fetch Data",
        category: "Network",
        description: "Fetch data from external API or database",
        inputs: [
            { name: "source", type: "string", required: true },
            { name: "query", type: "string", required: true },
        ],
        outputs: [
            { name: "data", type: "object" },
            { name: "metadata", type: "object" },
        ],
    },
    {
        id: "transform_data",
        name: "Transform Data",
        category: "Data",
        description: "Apply transformation to data",
        inputs: [
            { name: "input_data", type: "object", required: true },
            { name: "transform_type", type: "string", required: true },
        ],
        outputs: [{ name: "transformed_data", type: "object" }],
    },
    {
        id: "generate_report",
        name: "Generate Report",
        category: "Output",
        description: "Generate a report from data",
        inputs: [
            { name: "data", type: "object", required: true },
            { name: "template", type: "string", required: true },
        ],
        outputs: [
            { name: "report", type: "object" },
            { name: "report_url", type: "string" },
        ],
    },
    {
        id: "execute_query",
        name: "Execute Query",
        category: "Database",
        description: "Execute SQL or NoSQL query",
        inputs: [
            { name: "connection", type: "object", required: true },
            { name: "query", type: "string", required: true },
        ],
        outputs: [
            { name: "results", type: "array" },
            { name: "affected_rows", type: "number" },
        ],
    },
    {
        id: "make_decision",
        name: "Make Decision",
        category: "Logic",
        description: "Conditional branching based on input",
        inputs: [
            { name: "condition", type: "boolean", required: true },
            { name: "context", type: "object", required: false },
        ],
        outputs: [
            { name: "true_path", type: "boolean" },
            { name: "false_path", type: "boolean" },
        ],
    },
];

// Color palette for different node types
const COLORS = {
    action: {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        border: "border-indigo-300 dark:border-indigo-700",
        text: "text-indigo-800 dark:text-indigo-200",
        shadow: "shadow-indigo-300/20 dark:shadow-indigo-900/30",
    },
    broker: {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-300 dark:border-amber-700",
        text: "text-amber-800 dark:text-amber-200",
        shadow: "shadow-amber-300/20 dark:shadow-amber-900/30",
    },
    source: {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        border: "border-emerald-300 dark:border-emerald-700",
        text: "text-emerald-800 dark:text-emerald-200",
        shadow: "shadow-emerald-300/20 dark:shadow-emerald-900/30",
    },
    destination: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        border: "border-purple-300 dark:border-purple-700",
        text: "text-purple-800 dark:text-purple-200",
        shadow: "shadow-purple-300/20 dark:shadow-purple-900/30",
    },
    input: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-300 dark:border-blue-700",
        text: "text-blue-800 dark:text-blue-200",
    },
    output: {
        bg: "bg-green-100 dark:bg-green-900/30",
        border: "border-green-300 dark:border-green-700",
        text: "text-green-800 dark:text-green-200",
    },
    selected: {
        border: "border-cyan-500 dark:border-cyan-400",
        shadow: "shadow-cyan-400/30 dark:shadow-cyan-300/30",
        ring: "ring-2 ring-cyan-400 dark:ring-cyan-300",
    },
};

// Categories with icons
const CATEGORIES = {
    All: <Layers size={18} />,
    Data: <Database size={18} />,
    AI: <Circle size={18} />,
    Network: <Workflow size={18} />,
    Communication: <User size={18} />,
    Logic: <GitBranch size={18} />,
    Database: <Database size={18} />,
    Output: <FileDown size={18} />,
};

const WorkflowBuilder = () => {
    // States for workflow management
    const [nodes, setNodes] = useState([]);
    const [connections, setConnections] = useState([]);
    const [brokers, setBrokers] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [draggingNode, setDraggingNode] = useState(null);
    const [draggingConnection, setDraggingConnection] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [minimap, setMinimap] = useState(true);
    const [scale, setScale] = useState(1);
    const [notification, setNotification] = useState(null);
    const [expandedPanels, setExpandedPanels] = useState({
        actionLibrary: true,
        brokers: true,
        properties: true,
    });

    // Refs for canvas and nodes
    const canvasRef = useRef(null);
    const workflowContainerRef = useRef(null);
    const nodeRefs = useRef({});

    // Mock functions for drag & drop
    const handleAddAction = (actionType) => {
        const id = `action-${Date.now()}`;
        const newNode = {
            id,
            type: "action",
            actionType: actionType.id,
            name: actionType.name,
            category: actionType.category,
            position: { x: 200, y: 200 },
            inputs: actionType.inputs.map((input) => ({ ...input, connected: false })),
            outputs: actionType.outputs.map((output) => ({ ...output, connected: false })),
            status: "idle", // idle, running, completed, error
        };
        setNodes((prev) => [...prev, newNode]);
        setSelectedNode(id);
    };

    const handleAddBroker = () => {
        const id = `broker-${Date.now()}`;
        const newBroker = {
            id,
            type: "broker",
            name: "Data Broker",
            position: { x: 400, y: 300 },
            inputs: [],
            outputs: [],
            mappedType: null,
            mappedValue: null,
        };
        setBrokers((prev) => [...prev, newBroker]);
        setSelectedNode(id);
    };

    const handleAddSource = () => {
        const id = `source-${Date.now()}`;
        const newSource = {
            id,
            type: "source",
            name: "User Input",
            position: { x: 100, y: 100 },
            dataType: "string",
            defaultValue: "",
            description: "Input value provided by user",
        };
        setNodes((prev) => [...prev, newSource]);
        setSelectedNode(id);
    };

    const handleAddDestination = (destType = "userOutput") => {
        const id = `destination-${Date.now()}`;
        const newDestination = {
            id,
            type: "destination",
            destinationType: destType,
            name: destType === "userOutput" ? "User Output" : "Database Output",
            position: { x: 600, y: 400 },
            dataMapping: {},
            icon: destType === "userOutput" ? <User size={18} /> : <Database size={18} />,
        };
        setNodes((prev) => [...prev, newDestination]);
        setSelectedNode(id);
    };

    const startConnectionDrag = (sourceId, outputName, isOutput = true) => {
        setDraggingConnection({
            sourceId,
            outputName,
            isOutput,
            targetId: null,
            inputName: null,
            points: [],
        });
    };

    const completeConnection = (targetId, inputName) => {
        if (!draggingConnection) return;

        // Create a new broker automatically if we're connecting action to action
        if (draggingConnection.isOutput) {
            const source = nodes.find((n) => n.id === draggingConnection.sourceId);
            const target = nodes.find((n) => n.id === targetId);

            if (source && source.type === "action" && target && target.type === "action") {
                // Create a broker node in between
                const brokerId = `broker-${Date.now()}`;
                const sourcePos = source.position;
                const targetPos = target.position;

                // Calculate broker position between source and target
                const brokerX = (sourcePos.x + targetPos.x) / 2;
                const brokerY = (sourcePos.y + targetPos.y) / 2;

                const newBroker = {
                    id: brokerId,
                    type: "broker",
                    name: "Auto Broker",
                    position: { x: brokerX, y: brokerY },
                    inputs: [{ name: draggingConnection.outputName, source: draggingConnection.sourceId }],
                    outputs: [{ name: inputName, target: targetId }],
                    mappedType: null,
                };

                setBrokers((prev) => [...prev, newBroker]);

                // Create two connections
                const connection1 = {
                    id: `conn-${Date.now()}-1`,
                    sourceId: draggingConnection.sourceId,
                    outputName: draggingConnection.outputName,
                    targetId: brokerId,
                    inputName: draggingConnection.outputName,
                };

                const connection2 = {
                    id: `conn-${Date.now()}-2`,
                    sourceId: brokerId,
                    outputName: inputName,
                    targetId: targetId,
                    inputName: inputName,
                };

                setConnections((prev) => [...prev, connection1, connection2]);
            } else {
                // Direct connection
                const newConnection = {
                    id: `conn-${Date.now()}`,
                    sourceId: draggingConnection.sourceId,
                    outputName: draggingConnection.outputName,
                    targetId: targetId,
                    inputName: inputName,
                };

                setConnections((prev) => [...prev, newConnection]);
            }
        }

        setDraggingConnection(null);
        showNotification("Connection created successfully");
    };

    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleNodeDrag = (e, id) => {
        if (!nodeRefs.current[id]) return;
        const rect = nodeRefs.current[id].getBoundingClientRect();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Get mouse position relative to canvas with scaling
        const x = (e.clientX - canvasRect.left) / scale;
        const y = (e.clientY - canvasRect.top) / scale;

        // Update node position (add offset)
        const offsetX = rect.width / 2;
        const offsetY = 20; // From the top of the element

        setNodes((prevNodes) =>
            prevNodes.map((node) => (node.id === id ? { ...node, position: { x: x - offsetX, y: y - offsetY } } : node))
        );

        setBrokers((prevBrokers) =>
            prevBrokers.map((broker) => (broker.id === id ? { ...broker, position: { x: x - offsetX, y: y - offsetY } } : broker))
        );
    };

    const togglePanel = (panel) => {
        setExpandedPanels((prev) => ({
            ...prev,
            [panel]: !prev[panel],
        }));
    };

    // Filter actions by search term and category
    const filteredActions = MOCK_ACTION_TYPES.filter((action) => {
        const matchesSearch =
            searchTerm === "" ||
            action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            action.description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === "All" || action.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    // Rendering helpers
    const renderNode = (node) => {
        const isSelected = selectedNode === node.id;
        let colorClass = COLORS.action;
        let icon = CATEGORIES[node.category] || <Circle size={18} />;

        if (node.type === "broker") {
            colorClass = COLORS.broker;
            icon = <GitBranch size={18} />;
        } else if (node.type === "source") {
            colorClass = COLORS.source;
            icon = <User size={18} />;
        } else if (node.type === "destination") {
            colorClass = COLORS.destination;
            icon = node.icon || <Database size={18} />;
        }

        return (
            <div
                ref={(el) => {
                    nodeRefs.current[node.id] = el;
                }}
                key={node.id}
                className={`absolute cursor-grab rounded-lg border shadow-md transition-all ${colorClass.bg} ${colorClass.border} ${
                    colorClass.shadow
                }
          ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.shadow} ring-1 ring-cyan-500 shadow-lg` : ""}`}
                style={{
                    left: `${node.position.x}px`,
                    top: `${node.position.y}px`,
                    zIndex: isSelected ? 10 : 1,
                    minWidth: "180px",
                    transform: `scale(${scale})`,
                    transformOrigin: "center top",
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node.id);
                }}
                draggable="true"
                onDragStart={(e) => {
                    setDraggingNode(node.id);
                    e.dataTransfer.setData("text/plain", node.id);
                    // Create ghost image
                    const ghost = document.createElement("div");
                    ghost.className = `p-2 rounded ${colorClass.bg} ${colorClass.border} shadow-md`;
                    ghost.textContent = node.name;
                    ghost.style.position = "absolute";
                    ghost.style.top = "-1000px";
                    document.body.appendChild(ghost);
                    e.dataTransfer.setDragImage(ghost, 0, 0);
                    setTimeout(() => {
                        document.body.removeChild(ghost);
                    }, 0);
                }}
                onDrag={(e) => {
                    if (e.clientX > 0 && e.clientY > 0) {
                        handleNodeDrag(e, node.id);
                    }
                }}
                onDragEnd={() => setDraggingNode(null)}
            >
                <div className={`flex items-center justify-between p-2 border-b ${colorClass.border} ${colorClass.text}`}>
                    <div className="flex items-center space-x-2">
                        {icon}
                        <span className="font-medium">{node.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        {node.type === "action" && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                        <button className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1">
                            <MoreHorizontal size={14} />
                        </button>
                    </div>
                </div>

                {/* Inputs */}
                {node.inputs && node.inputs.length > 0 && (
                    <div className="px-2 py-1">
                        {node.inputs.map((input, idx) => (
                            <div key={`input-${idx}`} className="flex items-center my-1 group">
                                <div
                                    className={`w-3 h-3 rounded-full border cursor-pointer ${COLORS.input.border} ${COLORS.input.bg} -ml-1.5 mr-2`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        completeConnection(node.id, input.name);
                                    }}
                                ></div>
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                    {input.name}
                                    {input.required ? "*" : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Outputs */}
                {node.outputs && node.outputs.length > 0 && (
                    <div className="border-t px-2 py-1 border-gray-200 dark:border-gray-700">
                        {node.outputs.map((output, idx) => (
                            <div key={`output-${idx}`} className="flex items-center justify-between my-1 group">
                                <span className="text-xs text-gray-700 dark:text-gray-300">{output.name}</span>
                                <div
                                    className={`w-3 h-3 rounded-full border cursor-pointer ${COLORS.output.border} ${COLORS.output.bg} mr-0 ml-2`}
                                    draggable
                                    onDragStart={() => startConnectionDrag(node.id, output.name, true)}
                                ></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderBroker = (broker) => {
        const isSelected = selectedNode === broker.id;

        return (
            <div
                ref={(el) => {
                    nodeRefs.current[broker.id] = el;
                }}
                key={broker.id}
                className={`absolute cursor-grab rounded-lg border shadow-md transition-all ${COLORS.broker.bg} ${COLORS.broker.border} ${
                    COLORS.broker.shadow
                }
          ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.shadow} ring-1 ring-cyan-500 shadow-lg` : ""}`}
                style={{
                    left: `${broker.position.x}px`,
                    top: `${broker.position.y}px`,
                    zIndex: isSelected ? 10 : 1,
                    width: "160px",
                    transform: `scale(${scale})`,
                    transformOrigin: "center top",
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(broker.id);
                }}
                draggable="true"
                onDragStart={(e) => {
                    setDraggingNode(broker.id);
                    e.dataTransfer.setData("text/plain", broker.id);
                }}
                onDrag={(e) => {
                    if (e.clientX > 0 && e.clientY > 0) {
                        handleNodeDrag(e, broker.id);
                    }
                }}
                onDragEnd={() => setDraggingNode(null)}
            >
                <div className={`flex items-center justify-between p-2 ${COLORS.broker.text}`}>
                    <div className="flex items-center space-x-2">
                        <GitBranch size={16} />
                        <span className="font-medium text-sm">{broker.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    </div>
                </div>

                <div className="p-2 text-xs border-t border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between">
                        <span>Value:</span>
                        <span className="font-mono">{broker.mappedType || "any"}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderConnection = (connection) => {
        const sourceNode = nodes.find((n) => n.id === connection.sourceId) || brokers.find((b) => b.id === connection.sourceId);
        const targetNode = nodes.find((n) => n.id === connection.targetId) || brokers.find((b) => b.id === connection.targetId);

        if (!sourceNode || !targetNode || !nodeRefs.current[sourceNode.id] || !nodeRefs.current[targetNode.id]) {
            return null;
        }

        // Calculate connection points
        const sourceRect = nodeRefs.current[sourceNode.id].getBoundingClientRect();
        const targetRect = nodeRefs.current[targetNode.id].getBoundingClientRect();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Output connector position (on the right side)
        const outputConnector =
            sourceNode.type === "broker"
                ? { x: sourceRect.right - canvasRect.left, y: sourceRect.top - canvasRect.top + 30 }
                : { x: sourceRect.right - canvasRect.left, y: sourceRect.top - canvasRect.top + 40 };

        // Input connector position (on the left side)
        const inputConnector =
            targetNode.type === "broker"
                ? { x: targetRect.left - canvasRect.left, y: targetRect.top - canvasRect.top + 30 }
                : { x: targetRect.left - canvasRect.left, y: targetRect.top - canvasRect.top + 40 };

        // Adjust for scaling
        const sourceX = outputConnector.x / scale;
        const sourceY = outputConnector.y / scale;
        const targetX = inputConnector.x / scale;
        const targetY = inputConnector.y / scale;

        // Bezier control points
        const controlPointX1 = sourceX + 50;
        const controlPointX2 = targetX - 50;

        const path = `M ${sourceX} ${sourceY} C ${controlPointX1} ${sourceY}, ${controlPointX2} ${targetY}, ${targetX} ${targetY}`;

        // Determine color based on connection type
        const connectionColor =
            sourceNode.type === "broker" || targetNode.type === "broker"
                ? "stroke-amber-400 dark:stroke-amber-500"
                : "stroke-indigo-400 dark:stroke-indigo-500";

        return (
            <path
                key={connection.id}
                d={path}
                className={`${connectionColor} fill-none transition-colors`}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
            />
        );
    };

    const renderDraggingConnection = () => {
        if (!draggingConnection) return null;

        const sourceNode =
            nodes.find((n) => n.id === draggingConnection.sourceId) || brokers.find((b) => b.id === draggingConnection.sourceId);

        if (!sourceNode || !nodeRefs.current[sourceNode.id]) return null;

        // Calculate start point
        const sourceRect = nodeRefs.current[sourceNode.id].getBoundingClientRect();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Output connector position (on the right side)
        const startX = (sourceRect.right - canvasRect.left) / scale;
        const startY = (sourceRect.top - canvasRect.top + 40) / scale;

        // End point follows the mouse
        const endX = (draggingConnection.currentX - canvasRect.left) / scale;
        const endY = (draggingConnection.currentY - canvasRect.top) / scale;

        // Bezier control points
        const controlPointX1 = startX + 50;
        const controlPointX2 = endX - 50;

        const path = `M ${startX} ${startY} C ${controlPointX1} ${startY}, ${controlPointX2} ${endY}, ${endX} ${endY}`;

        return (
            <path d={path} className="stroke-gray-400 dark:stroke-gray-500 stroke-dashed fill-none" strokeWidth="2" strokeDasharray="4" />
        );
    };

    // Track mouse position for dragging connections
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (draggingConnection) {
                setDraggingConnection((prev) => ({
                    ...prev,
                    currentX: e.clientX,
                    currentY: e.clientY,
                }));
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [draggingConnection]);

    // Handle canvas click to deselect
    const handleCanvasClick = () => {
        setSelectedNode(null);
    };

    // Update zoom level
    const handleZoom = (delta) => {
        setScale((prevScale) => {
            const newScale = prevScale + delta;
            return Math.min(Math.max(newScale, 0.5), 2);
        });
    };

    // Get selected node details
    const selectedNodeDetails = selectedNode
        ? nodes.find((n) => n.id === selectedNode) || brokers.find((b) => b.id === selectedNode)
        : null;

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
            <div className="bg-textured border-b border-gray-200 dark:border-gray-700 p-2 flex justify-between items-center">
                <div className="flex space-x-2 items-center">
                    <h1 className="font-bold text-lg">Workflow Builder</h1>
                    <div className="flex space-x-1">
                        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Play size={16} className="text-green-600 dark:text-green-400" />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Save size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Download size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1">
                        <button
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            onClick={() => handleZoom(-0.1)}
                        >
                            -
                        </button>
                        <span className="w-12 text-center text-sm">{Math.round(scale * 100)}%</span>
                        <button
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            onClick={() => handleZoom(0.1)}
                        >
                            +
                        </button>
                    </div>
                    <button
                        className={`p-1 rounded ${
                            minimap
                                ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                        onClick={() => setMinimap(!minimap)}
                    >
                        <Layers size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar - Component library */}
                <div className="w-64 bg-textured border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                    {/* Action Library */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <button
                            className="w-full p-3 flex items-center justify-between font-medium"
                            onClick={() => togglePanel("actionLibrary")}
                        >
                            <span className="flex items-center">
                                <Layers className="mr-2" size={18} />
                                Action Library
                            </span>
                            {expandedPanels.actionLibrary ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {expandedPanels.actionLibrary && (
                            <div className="p-2">
                                <div className="relative mb-2">
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                                        placeholder="Search actions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <Search className="absolute left-2 top-1.5 text-gray-400" size={16} />
                                </div>

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {Object.entries(CATEGORIES).map(([category, icon]) => (
                                        <button
                                            key={category}
                                            className={`px-2 py-1 rounded-md text-xs flex items-center ${
                                                selectedCategory === category
                                                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
                                                    : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            }`}
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            {React.cloneElement(icon, { size: 14, className: "mr-1" })}
                                            {category}
                                        </button>
                                    ))}
                                </div>

                                <div className="max-h-60 overflow-y-auto pr-1">
                                    {filteredActions.map((action) => (
                                        <div
                                            key={action.id}
                                            className="mb-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-md cursor-move hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-gray-200 dark:border-gray-600"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData("action", JSON.stringify(action));
                                            }}
                                            onDragEnd={() => handleAddAction(action)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    {CATEGORIES[action.category] &&
                                                        React.cloneElement(CATEGORIES[action.category], {
                                                            size: 16,
                                                            className: "mr-2 text-indigo-600 dark:text-indigo-400",
                                                        })}
                                                    <span className="font-medium text-sm">{action.name}</span>
                                                </div>
                                                <ArrowBigRight size={14} className="text-gray-400" />
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                                        </div>
                                    ))}

                                    {filteredActions.length === 0 && (
                                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                                            No actions match your search
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Brokers */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <button className="w-full p-3 flex items-center justify-between font-medium" onClick={() => togglePanel("brokers")}>
                            <span className="flex items-center">
                                <GitBranch className="mr-2" size={18} />
                                Brokers & Connections
                            </span>
                            {expandedPanels.brokers ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {expandedPanels.brokers && (
                            <div className="p-2">
                                <div
                                    className="mb-1 p-2 bg-amber-50 dark:bg-amber-900/30 rounded-md cursor-move hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800"
                                    onClick={handleAddBroker}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <GitBranch size={16} className="mr-2 text-amber-600 dark:text-amber-400" />
                                            <span className="font-medium text-sm">Data Broker</span>
                                        </div>
                                        <Plus size={14} className="text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connects data between actions</p>
                                </div>

                                <div
                                    className="mb-1 p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md cursor-move hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200 dark:border-emerald-800"
                                    onClick={handleAddSource}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <User size={16} className="mr-2 text-emerald-600 dark:text-emerald-400" />
                                            <span className="font-medium text-sm">Input Source</span>
                                        </div>
                                        <Plus size={14} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">User-provided input data</p>
                                </div>

                                <div
                                    className="mb-1 p-2 bg-purple-50 dark:bg-purple-900/30 rounded-md cursor-move hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
                                    onClick={() => handleAddDestination("userOutput")}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <User size={16} className="mr-2 text-purple-600 dark:text-purple-400" />
                                            <span className="font-medium text-sm">User Output</span>
                                        </div>
                                        <Plus size={14} className="text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Display output to user</p>
                                </div>

                                <div
                                    className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-md cursor-move hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800"
                                    onClick={() => handleAddDestination("database")}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Database size={16} className="mr-2 text-purple-600 dark:text-purple-400" />
                                            <span className="font-medium text-sm">Database Output</span>
                                        </div>
                                        <Plus size={14} className="text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Write output to database</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Properties */}
                    <div className="border-b border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
                        <button
                            className="w-full p-3 flex items-center justify-between font-medium"
                            onClick={() => togglePanel("properties")}
                        >
                            <span className="flex items-center">
                                <Settings className="mr-2" size={18} />
                                Properties
                            </span>
                            {expandedPanels.properties ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {expandedPanels.properties && (
                            <div className="p-2 flex-1 flex flex-col overflow-hidden">
                                {selectedNodeDetails ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">{selectedNodeDetails.name}</span>
                                            <button className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 mb-2">
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Type</div>
                                            <div className="font-medium capitalize">{selectedNodeDetails.type}</div>
                                        </div>

                                        {selectedNodeDetails.type === "action" && (
                                            <>
                                                <div className="text-sm font-medium mb-1">Inputs</div>
                                                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 mb-2 overflow-y-auto max-h-32">
                                                    {selectedNodeDetails.inputs?.map((input, idx) => (
                                                        <div key={idx} className="mb-1 last:mb-0 flex justify-between items-center">
                                                            <div className="flex items-center">
                                                                <div
                                                                    className={`w-2 h-2 rounded-full ${
                                                                        input.connected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-500"
                                                                    } mr-2`}
                                                                ></div>
                                                                <span>
                                                                    {input.name}
                                                                    {input.required ? "*" : ""}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{input.type}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="text-sm font-medium mb-1">Outputs</div>
                                                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 overflow-y-auto max-h-32">
                                                    {selectedNodeDetails.outputs?.map((output, idx) => (
                                                        <div key={idx} className="mb-1 last:mb-0 flex justify-between items-center">
                                                            <div className="flex items-center">
                                                                <div
                                                                    className={`w-2 h-2 rounded-full ${
                                                                        output.connected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-500"
                                                                    } mr-2`}
                                                                ></div>
                                                                <span>{output.name}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{output.type}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {selectedNodeDetails.type === "broker" && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 flex-1 overflow-y-auto">
                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                        Broker Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        value={selectedNodeDetails.name}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data Type</label>
                                                    <select
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        value={selectedNodeDetails.mappedType || ""}
                                                        onChange={() => {}}
                                                    >
                                                        <option value="">Any type</option>
                                                        <option value="string">String</option>
                                                        <option value="number">Number</option>
                                                        <option value="boolean">Boolean</option>
                                                        <option value="object">Object</option>
                                                        <option value="array">Array</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                        Default Value
                                                    </label>
                                                    <textarea
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 h-20 font-mono"
                                                        placeholder="Default value (optional)"
                                                        onChange={() => {}}
                                                    ></textarea>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNodeDetails.type === "source" && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 flex-1 overflow-y-auto">
                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                        Source Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        value={selectedNodeDetails.name}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Data Type</label>
                                                    <select
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        value={selectedNodeDetails.dataType || "string"}
                                                        onChange={() => {}}
                                                    >
                                                        <option value="string">String</option>
                                                        <option value="number">Number</option>
                                                        <option value="boolean">Boolean</option>
                                                        <option value="object">Object</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                        Description
                                                    </label>
                                                    <textarea
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 h-20"
                                                        value={selectedNodeDetails.description || ""}
                                                        placeholder="Help text for users"
                                                        onChange={() => {}}
                                                    ></textarea>
                                                </div>
                                            </div>
                                        )}

                                        {selectedNodeDetails.type === "destination" && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-2 flex-1 overflow-y-auto">
                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                        Destination Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        value={selectedNodeDetails.name}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div className="mb-2">
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                                                        Destination Type
                                                    </label>
                                                    <select
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        value={selectedNodeDetails.destinationType}
                                                        onChange={() => {}}
                                                    >
                                                        <option value="userOutput">User Output</option>
                                                        <option value="database">Database</option>
                                                        <option value="webhook">Webhook</option>
                                                        <option value="file">File</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Format</label>
                                                    <select
                                                        className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600"
                                                        onChange={() => {}}
                                                    >
                                                        <option value="json">JSON</option>
                                                        <option value="text">Text</option>
                                                        <option value="csv">CSV</option>
                                                        <option value="html">HTML</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                        <Settings size={24} />
                                        <p className="mt-2 text-sm">Select a node to edit properties</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main workflow area */}
                <div className="flex-1 relative overflow-hidden" ref={workflowContainerRef}>
                    <div
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full bg-textured cursor-grab"
                        onClick={handleCanvasClick}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => e.preventDefault()}
                    >
                        {/* Grid background */}
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path
                                        d="M 20 0 L 0 0 0 20"
                                        fill="none"
                                        stroke="rgba(0, 0, 0, 0.05)"
                                        strokeWidth="0.5"
                                        className="dark:stroke-gray-800"
                                    />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>

                        {/* Connection vectors */}
                        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" className="fill-current text-gray-400 dark:text-gray-500" />
                                </marker>
                            </defs>
                            {connections.map(renderConnection)}
                            {draggingConnection && renderDraggingConnection()}
                        </svg>

                        {/* Actions */}
                        {nodes.map(renderNode)}

                        {/* Brokers */}
                        {brokers.map(renderBroker)}
                    </div>

                    {/* Minimap */}
                    {minimap && (
                        <div className="absolute bottom-4 right-4 w-48 h-32 bg-textured rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                Workflow Overview
                            </div>
                            <div className="relative w-full h-full bg-gray-50 dark:bg-gray-900/50 p-1">
                                {/* Simplified nodes */}
                                {[...nodes, ...brokers].map((node) => {
                                    // Calculate relative position for minimap
                                    const x = (node.position.x / 2000) * 100;
                                    const y = (node.position.y / 1000) * 100;

                                    let bgColor = "bg-indigo-400";
                                    if (node.type === "broker") bgColor = "bg-amber-400";
                                    if (node.type === "source") bgColor = "bg-emerald-400";
                                    if (node.type === "destination") bgColor = "bg-purple-400";

                                    return (
                                        <div
                                            key={`mini-${node.id}`}
                                            className={`absolute w-3 h-2 rounded-sm ${bgColor}`}
                                            style={{
                                                left: `${x}%`,
                                                top: `${y}%`,
                                            }}
                                        ></div>
                                    );
                                })}

                                {/* Viewport indicator */}
                                <div
                                    className="absolute border-2 border-blue-500/50 rounded pointer-events-none"
                                    style={{
                                        left: "20%",
                                        top: "20%",
                                        width: "40%",
                                        height: "40%",
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification toast */}
            {notification && (
                <div
                    className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center p-4 rounded-lg shadow-lg z-50 
          ${
              notification.type === "success"
                  ? "bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200"
          }`}
                >
                    {notification.type === "success" ? <Check className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
                    <span>{notification.message}</span>
                </div>
            )}

            <style jsx global>{`
                /* For the dashed line when dragging connections */
                .stroke-dashed {
                    stroke-dasharray: 4, 4;
                }
            `}</style>
        </div>
    );
};

export default WorkflowBuilder;
