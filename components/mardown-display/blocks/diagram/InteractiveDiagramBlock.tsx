"use client";
import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  BackgroundVariant,
  Panel,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Network, Maximize2, Minimize2, Download, Share2, RotateCcw, 
  ZoomIn, ZoomOut, Move, Square, Circle, Diamond, Triangle,
  GitBranch, Users, Database, Server, Globe, Cpu, HardDrive,
  Layers, Settings, Info, AlertCircle, CheckCircle2, XCircle,
  ArrowRight, ArrowDown, ArrowUp, ArrowLeft, Sparkles
} from 'lucide-react';

// Custom Node Components
const CustomNode = ({ data, selected }: any) => {
  const getNodeIcon = () => {
    switch (data.nodeType) {
      case 'process': return <Settings className="h-4 w-4" />;
      case 'decision': return <GitBranch className="h-4 w-4" />;
      case 'data': return <Database className="h-4 w-4" />;
      case 'start': return <CheckCircle2 className="h-4 w-4" />;
      case 'end': return <XCircle className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'system': return <Server className="h-4 w-4" />;
      case 'api': return <Globe className="h-4 w-4" />;
      case 'compute': return <Cpu className="h-4 w-4" />;
      case 'storage': return <HardDrive className="h-4 w-4" />;
      default: return <Square className="h-4 w-4" />;
    }
  };

  const getNodeColor = () => {
    switch (data.nodeType) {
      case 'start': return 'bg-green-100 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-300';
      case 'end': return 'bg-red-100 dark:bg-red-950/30 border-red-500 text-red-700 dark:text-red-300';
      case 'decision': return 'bg-orange-100 dark:bg-orange-950/30 border-orange-500 text-orange-700 dark:text-orange-300';
      case 'process': return 'bg-blue-100 dark:bg-blue-950/30 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'data': return 'bg-purple-100 dark:bg-purple-950/30 border-purple-500 text-purple-700 dark:text-purple-300';
      case 'user': return 'bg-indigo-100 dark:bg-indigo-950/30 border-indigo-500 text-indigo-700 dark:text-indigo-300';
      case 'system': return 'bg-gray-100 dark:bg-gray-800 border-gray-500 text-gray-700 dark:text-gray-300';
      case 'api': return 'bg-teal-100 dark:bg-teal-950/30 border-teal-500 text-teal-700 dark:text-teal-300';
      case 'compute': return 'bg-yellow-100 dark:bg-yellow-950/30 border-yellow-500 text-yellow-700 dark:text-yellow-300';
      case 'storage': return 'bg-pink-100 dark:bg-pink-950/30 border-pink-500 text-pink-700 dark:text-pink-300';
      default: return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 min-w-[120px] shadow-lg transition-all ${getNodeColor()} ${
      selected ? 'shadow-xl scale-105 ring-2 ring-blue-400 dark:ring-blue-500' : 'hover:shadow-md'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {getNodeIcon()}
        <div className="font-semibold text-sm">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-xs opacity-80 mt-1">{data.description}</div>
      )}
      {data.details && (
        <div className="text-xs opacity-70 mt-1 italic">{data.details}</div>
      )}
    </div>
  );
};

// Custom Edge Component
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, data }: any) => {
  const edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  
  return (
    <g>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={data?.color || '#6b7280'}
        strokeWidth={data?.strokeWidth || 2}
        strokeDasharray={data?.dashed ? '5,5' : 'none'}
        markerEnd="url(#reactflow__arrowclosed)"
      />
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          className="react-flow__edge-text"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fill={data?.color || '#6b7280'}
        >
          {data.label}
        </text>
      )}
    </g>
  );
};

interface DiagramData {
  title: string;
  description?: string;
  type: 'flowchart' | 'mindmap' | 'orgchart' | 'network' | 'system' | 'process';
  nodes: Array<{
    id: string;
    label: string;
    type?: string;
    nodeType?: string;
    description?: string;
    details?: string;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: string;
    color?: string;
    dashed?: boolean;
    strokeWidth?: number;
  }>;
  layout?: {
    direction?: 'TB' | 'LR' | 'BT' | 'RL';
    spacing?: number;
  };
}

interface InteractiveDiagramBlockProps {
  diagram: DiagramData;
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// Remove custom edge types for now to avoid conflicts
// const edgeTypes: EdgeTypes = {
//   custom: CustomEdge,
// };

const InteractiveDiagramBlock: React.FC<InteractiveDiagramBlockProps> = ({ diagram }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);

  // Convert diagram data to ReactFlow format
  const initialNodes: Node[] = useMemo(() => {
    return diagram.nodes.map((node, index) => ({
      id: node.id,
      type: 'custom',
      position: node.position || { 
        x: (index % 3) * 200 + 100, 
        y: Math.floor(index / 3) * 150 + 100 
      },
      data: {
        label: node.label,
        nodeType: node.nodeType || node.type || 'default',
        description: node.description,
        details: node.details,
      },
    }));
  }, [diagram.nodes]);

  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(diagram.nodes.map(node => node.id));
    
    const processedEdges = diagram.edges
      .filter((edge) => {
        // Validate that source and target nodes exist
        const sourceExists = nodeIds.has(edge.source);
        const targetExists = nodeIds.has(edge.target);
        
        if (!sourceExists || !targetExists) {
          console.warn(`Edge ${edge.id} references non-existent nodes:`, {
            source: edge.source,
            target: edge.target,
            sourceExists,
            targetExists,
            availableNodes: Array.from(nodeIds)
          });
          return false;
        }
        
        return true;
      })
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'default', // Use default ReactFlow edge type for better compatibility
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: edge.color || '#6b7280',
        },
        style: {
          stroke: edge.color || '#6b7280',
          strokeWidth: edge.strokeWidth || 2,
          strokeDasharray: edge.dashed ? '5,5' : 'none',
        },
        label: edge.label,
        labelStyle: { 
          fontSize: 12, 
          fontWeight: 500,
          fill: edge.color || '#6b7280',
        },
        labelBgStyle: { 
          fill: '#ffffff', 
          fillOpacity: 0.8,
          rx: 4,
          ry: 4,
        },
      }));
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Diagram edges data:', diagram.edges);
      console.log('Processed edges for ReactFlow:', processedEdges);
      console.log('Available node IDs:', Array.from(nodeIds));
      console.log('Filtered out invalid edges:', diagram.edges.length - processedEdges.length);
    }
    
    return processedEdges;
  }, [diagram.edges, diagram.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const getDiagramIcon = () => {
    switch (diagram.type) {
      case 'flowchart': return <GitBranch className="h-6 w-6" />;
      case 'mindmap': return <Sparkles className="h-6 w-6" />;
      case 'orgchart': return <Users className="h-6 w-6" />;
      case 'network': return <Network className="h-6 w-6" />;
      case 'system': return <Server className="h-6 w-6" />;
      case 'process': return <Settings className="h-6 w-6" />;
      default: return <Network className="h-6 w-6" />;
    }
  };

  const resetLayout = () => {
    const layoutNodes = diagram.nodes.map((node, index) => ({
      ...nodes.find(n => n.id === node.id)!,
      position: node.position || { 
        x: (index % 3) * 200 + 100, 
        y: Math.floor(index / 3) * 150 + 100 
      },
    }));
    setNodes(layoutNodes);
  };

  const exportDiagram = () => {
    // Create a simple export of the current diagram state
    const exportData = {
      title: diagram.title,
      nodes: nodes.map(node => ({
        id: node.id,
        label: node.data.label,
        position: node.position,
        type: node.data.nodeType,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
      })),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Fullscreen Backdrop */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsFullScreen(false)}
        />
      )}

      <div className={`w-full ${isFullScreen ? 'fixed inset-0 z-50 flex items-center justify-center p-4' : 'py-6'}`}>
        <div className={`max-w-7xl mx-auto ${isFullScreen ? 'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl h-full max-h-[95vh] w-full flex flex-col overflow-hidden' : ''}`}>
          
          {/* Header */}
          <div className={`${isFullScreen ? 'flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700' : ''}`}>
            <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-800/50">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-md">
                    {getDiagramIcon()}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {diagram.title}
                    </h1>
                    {diagram.description && (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                        {diagram.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium capitalize">
                        {diagram.type}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {diagram.nodes.length} nodes
                      </span>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {diagram.edges.length} connections
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={exportDiagram}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                  <button
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showMiniMap 
                        ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    {showMiniMap ? 'Hide' : 'Show'} Mini Map
                  </button>
                  {!isFullScreen && (
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 dark:bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span>Full Screen</span>
                    </button>
                  )}
                  {isFullScreen && (
                    <button
                      onClick={() => setIsFullScreen(false)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all shadow-sm border border-gray-200 dark:border-gray-600"
                    >
                      <Minimize2 className="h-4 w-4" />
                      <span>Exit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ReactFlow Container */}
          <div className={`${isFullScreen ? 'flex-1' : 'h-[600px]'} bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}>
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
                className="bg-gray-50 dark:bg-gray-900"
              >
                <Background 
                  variant={backgroundVariant} 
                  gap={20} 
                  size={1}
                  className="bg-gray-50 dark:bg-gray-900"
                />
                
                <Controls 
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
                  showInteractive={false}
                />
                
                {showMiniMap && (
                  <MiniMap
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
                    nodeColor={(node) => {
                      switch (node.data.nodeType) {
                        case 'start': return '#10b981';
                        case 'end': return '#ef4444';
                        case 'decision': return '#f59e0b';
                        case 'process': return '#3b82f6';
                        case 'data': return '#8b5cf6';
                        default: return '#6b7280';
                      }
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                  />
                )}

                <Panel position="top-right" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={resetLayout}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Reset Layout"
                    >
                      <RotateCcw className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => setBackgroundVariant(
                        backgroundVariant === BackgroundVariant.Dots 
                          ? BackgroundVariant.Lines 
                          : BackgroundVariant.Dots
                      )}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Toggle Background"
                    >
                      <Square className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </Panel>
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* Legend */}
          <div className={`${isFullScreen ? 'flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700' : 'mt-6'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Node Types
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { type: 'start', label: 'Start', color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
                  { type: 'process', label: 'Process', color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300', icon: Settings },
                  { type: 'decision', label: 'Decision', color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300', icon: GitBranch },
                  { type: 'data', label: 'Data', color: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300', icon: Database },
                  { type: 'end', label: 'End', color: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300', icon: XCircle },
                ].map(({ type, label, color, icon: Icon }) => (
                  <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color} text-xs font-medium`}>
                    <Icon className="h-3 w-3" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InteractiveDiagramBlock;
