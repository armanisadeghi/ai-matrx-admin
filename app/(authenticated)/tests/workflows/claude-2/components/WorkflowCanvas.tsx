import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, GitBranch, Circle, User, Database, ChevronLeft } from 'lucide-react';

// Sample data for demo - this would come from your context in real implementation
const sampleNodes = [
  {
    id: 'action-1',
    type: 'action',
    name: 'Process Data',
    category: 'Data',
    position: { x: 100, y: 150 },
    inputs: [
      { name: 'data', type: 'object', required: true },
      { name: 'algorithm', type: 'string', required: true }
    ],
    outputs: [
      { name: 'processed_data', type: 'object' },
      { name: 'stats', type: 'object' }
    ],
    status: 'idle'
  },
  {
    id: 'source-1',
    type: 'source',
    name: 'User Input',
    position: { x: 100, y: 300 },
    dataType: 'object',
    description: 'Data from user'
  },
  {
    id: 'destination-1',
    type: 'destination',
    name: 'User Output',
    destinationType: 'userOutput',
    position: { x: 500, y: 150 },
    dataMapping: {}
  }
];

const sampleBrokers = [
  {
    id: 'broker-1',
    type: 'broker',
    name: 'Data Broker',
    position: { x: 300, y: 150 },
    mappedType: 'object'
  },
  {
    id: 'broker-2',
    type: 'broker',
    name: 'Status Broker',
    position: { x: 300, y: 300 },
    mappedType: 'string'
  }
];

const sampleConnections = [
  {
    id: 'conn-1',
    sourceId: 'action-1',
    outputName: 'processed_data',
    targetId: 'broker-1',
    inputName: 'data'
  },
  {
    id: 'conn-2',
    sourceId: 'broker-1',
    outputName: 'data',
    targetId: 'destination-1',
    inputName: 'data'
  },
  {
    id: 'conn-3',
    sourceId: 'source-1',
    outputName: 'output',
    targetId: 'broker-2',
    inputName: 'input'
  }
];

// Color palette for different node types
const COLORS = {
  action: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-800 dark:text-indigo-200'
  },
  broker: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-200'
  },
  source: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-200'
  },
  destination: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-200'
  },
  input: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200'
  },
  output: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200'
  },
  selected: {
    border: 'border-cyan-500 dark:border-cyan-400',
    ring: 'ring-2 ring-cyan-400 dark:ring-cyan-300'
  }
};

const WorkflowCanvas = () => {
  // State
  const [nodes, setNodes] = useState(sampleNodes);
  const [brokers, setBrokers] = useState(sampleBrokers);
  const [connections, setConnections] = useState(sampleConnections);
  const [selectedNode, setSelectedNode] = useState(null);
  const [scale, setScale] = useState(1);
  const [minimap, setMinimap] = useState(true);
  const [draggingNode, setDraggingNode] = useState(null);
  const [draggingConnection, setDraggingConnection] = useState(null);
  const [nodePanelExpanded, setNodePanelExpanded] = useState(true);

  // Refs
  const canvasRef = useRef(null);
  const nodeRefs = useRef({});

  // Handle zoom
  const handleZoom = (delta) => {
    setScale(prevScale => {
      const newScale = prevScale + delta;
      return Math.min(Math.max(newScale, 0.5), 2);
    });
  };

  // Handle canvas click to deselect nodes
  const handleCanvasClick = () => {
    setSelectedNode(null);
  };

  // Handle node drag
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
    
    setNodes(prevNodes => 
      prevNodes.map(node => node.id === id ? { ...node, position: { x: x - offsetX, y: y - offsetY } } : node)
    );
    
    setBrokers(prevBrokers => 
      prevBrokers.map(broker => broker.id === id ? { ...broker, position: { x: x - offsetX, y: y - offsetY } } : broker)
    );
  };

  // Start dragging a connection
  const startConnectionDrag = (sourceId, outputName, isOutput = true) => {
    setDraggingConnection({
      sourceId,
      outputName,
      isOutput,
      targetId: null,
      inputName: null,
      points: [],
      currentX: 0,
      currentY: 0
    });
  };

  // Complete a connection
  const completeConnection = (targetId, inputName) => {
    if (!draggingConnection) return;
    
    // Create a new connection
    const newConnection = {
      id: `conn-${Date.now()}`,
      sourceId: draggingConnection.sourceId,
      outputName: draggingConnection.outputName,
      targetId: targetId,
      inputName: inputName
    };
    
    setConnections(prev => [...prev, newConnection]);
    setDraggingConnection(null);
  };

  // Track mouse position for dragging connections
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggingConnection) {
        setDraggingConnection(prev => ({
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY
        }));
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [draggingConnection]);

  // Rendering helpers
  const renderNode = (node) => {
    const isSelected = selectedNode === node.id;
    let colorClass = COLORS.action;
    let icon = <Circle size={18} />;
    
    if (node.type === 'source') {
      colorClass = COLORS.source;
      icon = <User size={18} />;
    } else if (node.type === 'destination') {
      colorClass = COLORS.destination;
      icon = <Database size={18} />;
    }
    
    return (
      <div 
        ref={el => { nodeRefs.current[node.id] = el }}
        key={node.id}
        className={`absolute cursor-grab rounded-lg border shadow-md transition-all ${colorClass.bg} ${colorClass.border}
          ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.ring} shadow-lg` : ''}`}
        style={{
          left: `${node.position.x}px`,
          top: `${node.position.y}px`,
          zIndex: isSelected ? 10 : 1,
          minWidth: '180px',
          transform: `scale(${scale})`,
          transformOrigin: 'center top'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(node.id);
        }}
        draggable="true"
        onDragStart={(e) => {
          setDraggingNode(node.id);
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
            {node.type === 'action' && (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            )}
          </div>
        </div>
        
        {/* Inputs */}
        {node.inputs && node.inputs.length > 0 && (
          <div className="px-2 py-1">
            {node.inputs.map((input, idx) => (
              <div 
                key={`input-${idx}`}
                className="flex items-center my-1 group"
              >
                <div 
                  className={`w-3 h-3 rounded-full border cursor-pointer ${COLORS.input.border} ${COLORS.input.bg} -ml-1.5 mr-2`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    completeConnection(node.id, input.name);
                  }}
                ></div>
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {input.name}{input.required ? '*' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Outputs */}
        {node.outputs && node.outputs.length > 0 && (
          <div className="border-t px-2 py-1 border-gray-200 dark:border-gray-700">
            {node.outputs.map((output, idx) => (
              <div 
                key={`output-${idx}`}
                className="flex items-center justify-between my-1 group"
              >
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
        ref={el => { nodeRefs.current[broker.id] = el }}
        key={broker.id}
        className={`absolute cursor-grab rounded-lg border shadow-md transition-all ${COLORS.broker.bg} ${COLORS.broker.border}
          ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.ring} shadow-lg` : ''}`}
        style={{
          left: `${broker.position.x}px`,
          top: `${broker.position.y}px`,
          zIndex: isSelected ? 10 : 1,
          width: '160px',
          transform: `scale(${scale})`,
          transformOrigin: 'center top'
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(broker.id);
        }}
        draggable="true"
        onDragStart={() => {
          setDraggingNode(broker.id);
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
            <span className="font-mono">{broker.mappedType || 'any'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderConnection = (connection) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceId) || 
                       brokers.find(b => b.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId) || 
                       brokers.find(b => b.id === connection.targetId);
                       
    if (!sourceNode || !targetNode || !nodeRefs.current[sourceNode.id] || !nodeRefs.current[targetNode.id]) {
      return null;
    }
    
    // Calculate connection points
    const sourceRect = nodeRefs.current[sourceNode.id].getBoundingClientRect();
    const targetRect = nodeRefs.current[targetNode.id].getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Output connector position (on the right side)
    const outputConnector = sourceNode.type === 'broker' 
      ? { x: sourceRect.right - canvasRect.left, y: sourceRect.top - canvasRect.top + 30 } 
      : { x: sourceRect.right - canvasRect.left, y: sourceRect.top - canvasRect.top + 40 };
      
    // Input connector position (on the left side)
    const inputConnector = targetNode.type === 'broker'
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
    const connectionColor = sourceNode.type === 'broker' || targetNode.type === 'broker' 
      ? 'stroke-amber-400 dark:stroke-amber-500' 
      : 'stroke-indigo-400 dark:stroke-indigo-500';
    
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
    
    const sourceNode = nodes.find(n => n.id === draggingConnection.sourceId) || 
                       brokers.find(b => b.id === draggingConnection.sourceId);
                       
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
      <path 
        d={path}
        className="stroke-gray-400 dark:stroke-gray-500 stroke-dashed fill-none"
        strokeWidth="2"
        strokeDasharray="4"
      />
    );
  };

  return (
    <div className="w-full h-full flex">
      {/* Left panel (nodes library - could be a separate component) */}
      <div className={`${nodePanelExpanded ? 'w-64' : 'w-12'} bg-textured border-r border-gray-200 dark:border-gray-700 flex flex-col transition-width duration-300`}>
        <button 
          className="w-full p-3 flex items-center justify-between font-medium border-b border-gray-200 dark:border-gray-700"
          onClick={() => setNodePanelExpanded(!nodePanelExpanded)}
        >
          {nodePanelExpanded ? (
            <>
              <span>Workflow Components</span>
              <ChevronLeft size={18} />
            </>
          ) : (
            <ChevronRight size={18} className="mx-auto" />
          )}
        </button>
        
        {nodePanelExpanded && (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                Actions
              </h3>
              <div className="space-y-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md cursor-move hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center mb-1">
                    <Circle size={14} className="mr-2 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-medium text-sm">Process Data</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Transform and analyze data</p>
                </div>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md cursor-move hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center mb-1">
                    <Circle size={14} className="mr-2 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-medium text-sm">Generate Text</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create text using LLM</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                Brokers
              </h3>
              <div className="space-y-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md cursor-move hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center mb-1">
                    <GitBranch size={14} className="mr-2 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-sm">Data Broker</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Connect action outputs to inputs</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
                Sources
              </h3>
              <div className="space-y-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-md cursor-move hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center mb-1">
                    <User size={14} className="mr-2 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-sm">User Input</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Get data from user</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                Destinations
              </h3>
              <div className="space-y-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md cursor-move hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-1">
                    <User size={14} className="mr-2 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-sm">User Output</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Display result to user</p>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md cursor-move hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-1">
                    <Database size={14} className="mr-2 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-sm">Database</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Save result to database</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Main canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-2 left-2 z-10 bg-textured rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex items-center p-1">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleZoom(-0.1)}
          >
            -
          </button>
          <span className="w-12 text-center text-sm">{Math.round(scale * 100)}%</span>
          <button 
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => handleZoom(0.1)}
          >
            +
          </button>
        </div>
        
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
          <svg 
            width="100%" 
            height="100%" 
            className="absolute inset-0 pointer-events-none"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  className="fill-current text-gray-400 dark:text-gray-500"
                />
              </marker>
            </defs>
            {connections.map(renderConnection)}
            {draggingConnection && renderDraggingConnection()}
          </svg>
          
          {/* Render all nodes */}
          {nodes.map(renderNode)}
          
          {/* Render all brokers */}
          {brokers.map(renderBroker)}
        </div>
        
        {/* Minimap */}
        {minimap && (
          <div className="absolute bottom-4 right-4 w-48 h-32 bg-textured rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <span>Workflow Overview</span>
              <button 
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                onClick={() => setMinimap(false)}
              >
                <X size={12} />
              </button>
            </div>
            <div className="relative w-full h-full bg-gray-50 dark:bg-gray-900/50 p-1">
              {/* Simplified nodes */}
              {[...nodes, ...brokers].map(node => {
                // Calculate relative position for minimap
                const x = (node.position.x / 2000) * 100;
                const y = (node.position.y / 1000) * 100;
                
                let bgColor = "bg-indigo-400";
                if (node.type === 'broker') bgColor = "bg-amber-400";
                if (node.type === 'source') bgColor = "bg-emerald-400";
                if (node.type === 'destination') bgColor = "bg-purple-400";
                
                return (
                  <div 
                    key={`mini-${node.id}`}
                    className={`absolute w-3 h-2 rounded-sm ${bgColor}`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`
                    }}
                  ></div>
                );
              })}
              
              {/* Viewport indicator */}
              <div className="absolute border-2 border-blue-500/50 rounded pointer-events-none"
                style={{
                  left: '20%',
                  top: '20%',
                  width: '40%',
                  height: '40%'
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Right panel - properties (could be a separate component) */}
      {selectedNode && (
        <div className="w-64 bg-textured border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-3 flex items-center justify-between font-medium border-b border-gray-200 dark:border-gray-700">
            <span>Properties</span>
            <button onClick={() => setSelectedNode(null)}>
              <X size={18} />
            </button>
          </div>
          
          <div className="p-3 flex-1 overflow-y-auto">
            {/* Node details go here - would be populated based on selectedNode */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input 
                type="text" 
                className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                value={
                  nodes.find(n => n.id === selectedNode)?.name || 
                  brokers.find(b => b.id === selectedNode)?.name || 
                  ''
                }
                readOnly
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <div className="px-2 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 font-medium">
                {nodes.find(n => n.id === selectedNode)?.type || 
                 brokers.find(b => b.id === selectedNode)?.type || 
                 ''}
              </div>
            </div>
            
            {/* Show different properties based on node type */}
            {(nodes.find(n => n.id === selectedNode)?.type === 'action' || brokers.find(b => b.id === selectedNode)) && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Data Type</label>
                <select 
                  className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                >
                  <option value="any">Any</option>
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="object">Object</option>
                  <option value="array">Array</option>
                </select>
              </div>
            )}
            
            {nodes.find(n => n.id === selectedNode)?.inputs && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Inputs</label>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                  {nodes.find(n => n.id === selectedNode)?.inputs.map((input, idx) => (
                    <div key={idx} className="flex justify-between text-sm mb-1 last:mb-0">
                      <span>{input.name}</span>
                      <span className="text-xs opacity-70">{input.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {nodes.find(n => n.id === selectedNode)?.outputs && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Outputs</label>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
                  {nodes.find(n => n.id === selectedNode)?.outputs.map((output, idx) => (
                    <div key={idx} className="flex justify-between text-sm mb-1 last:mb-0">
                      <span>{output.name}</span>
                      <span className="text-xs opacity-70">{output.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;