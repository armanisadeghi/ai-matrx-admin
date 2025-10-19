"use client";
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  MarkerType,
  BackgroundVariant,
  Panel,
  MiniMap,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
  getRectOfNodes,
  getTransformForBounds,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Network, Maximize2, Minimize2, Download, Layers, Settings, 
  CheckCircle2, XCircle, GitBranch, Users, Database, Server, Globe, 
  Cpu, HardDrive, RotateCcw, Square, Circle, Sparkles, Shuffle, Camera
} from 'lucide-react';
import { getLayoutedElements, getLayoutOptionsForDiagramType, getRadialLayout, getOrgChartLayout } from './layout-utils';
import { getOrgChartRoleIcon, formatDiagramType } from './ui-utils';

// Custom Node Components
const CustomNode = ({ data, selected }: any) => {
  const getNodeIcon = () => {
    // For organizational charts, use role-based icons
    if (data.diagramType === 'orgchart') {
      return getOrgChartRoleIcon(data.label, data.description, data.details);
    }
    
    // For other diagram types, use the original logic
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
      default: return 'bg-textured border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
    }
  };

  // Check if this is an org chart node for special styling
  const isOrgChart = data.diagramType === 'orgchart';
  
  return (
    <div className={`${isOrgChart ? 'px-6 py-4 min-w-[200px]' : 'px-4 py-3 min-w-[120px]'} rounded-lg border-2 shadow-lg transition-all ${getNodeColor()} ${
      selected ? 'shadow-xl scale-105 ring-2 ring-blue-400 dark:ring-blue-500' : 'hover:shadow-md'
    }`}>
      {/* Input Handle - positioned based on diagram type */}
      <Handle
        type="target"
        position={isOrgChart ? Position.Top : Position.Left}
        id="input"
        style={isOrgChart ? { 
          left: '50%', 
          transform: 'translateX(-50%)',
          top: '-6px'
        } : {}}
        className="w-3 h-3 border-2 border-gray-400 dark:border-gray-500 bg-textured hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
      />
      
      {isOrgChart ? (
        // Org chart specific layout - centered and hierarchical
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {getNodeIcon()}
            <div className="font-bold text-base">{data.label}</div>
          </div>
          {data.description && (
            <div className="text-sm font-medium opacity-90 mb-1">{data.description}</div>
          )}
          {data.details && (
            <div className="text-xs opacity-70 italic">{data.details}</div>
          )}
        </div>
      ) : (
        // Regular diagram layout
        <div>
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
      )}
      
      {/* Output Handle - positioned based on diagram type */}
      <Handle
        type="source"
        position={isOrgChart ? Position.Bottom : Position.Right}
        id="output"
        style={isOrgChart ? { 
          left: '50%', 
          transform: 'translateX(-50%)',
          bottom: '-6px'
        } : {}}
        className="w-3 h-3 border-2 border-gray-400 dark:border-gray-500 bg-textured hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
      />
    </div>
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

// Inner component that uses ReactFlow hooks
const DiagramFlow: React.FC<{ 
  diagram: DiagramData;
  showMiniMap: boolean;
  setShowMiniMap: (show: boolean) => void;
  backgroundVariant: BackgroundVariant;
  setBackgroundVariant: (variant: BackgroundVariant) => void;
  onExportImage: () => void;
}> = ({ diagram, showMiniMap, setShowMiniMap, backgroundVariant, setBackgroundVariant, onExportImage }) => {
  const { fitView, getNodes } = useReactFlow();
  const hasAutoLayoutApplied = useRef(false);

  // Enhanced image export function that properly handles viewport and theme
  const exportImage = useCallback(() => {
    const nodes = getNodes();
    const nodesBounds = getRectOfNodes(nodes);
    const imageWidth = 1024;
    const imageHeight = 768;
    
    // Calculate transform to fit all nodes in the export
    const transform = getTransformForBounds(nodesBounds, imageWidth, imageHeight, 0.1, 2);
    
    // Get the React Flow container
    const reactFlowInstance = document.querySelector('.react-flow');
    if (!reactFlowInstance) {
      onExportImage(); // Fallback to original method
      return;
    }

    // Detect current theme (dark mode)
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                      document.body.classList.contains('dark') ||
                      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Get computed background color from React Flow instance
    const computedStyle = window.getComputedStyle(reactFlowInstance);
    const currentBgColor = computedStyle.backgroundColor || (isDarkMode ? '#111827' : '#ffffff');

    // Create a temporary container for export that matches current theme
    const exportContainer = document.createElement('div');
    exportContainer.style.position = 'absolute';
    exportContainer.style.top = '-9999px';
    exportContainer.style.left = '-9999px';
    exportContainer.style.width = `${imageWidth}px`;
    exportContainer.style.height = `${imageHeight}px`;
    exportContainer.style.background = currentBgColor;
    
    // Apply dark mode class if needed to ensure proper styling
    if (isDarkMode) {
      exportContainer.classList.add('dark');
    }
    
    document.body.appendChild(exportContainer);

    // Clone the entire React Flow instance to preserve all styling
    const clonedReactFlow = reactFlowInstance.cloneNode(true) as HTMLElement;
    
    // Ensure the cloned element maintains theme classes
    if (isDarkMode && !clonedReactFlow.classList.contains('dark')) {
      clonedReactFlow.classList.add('dark');
    }
    
    // Set dimensions and apply transform
    clonedReactFlow.style.width = `${imageWidth}px`;
    clonedReactFlow.style.height = `${imageHeight}px`;
    clonedReactFlow.style.position = 'relative';
    clonedReactFlow.style.overflow = 'hidden';
    
    // Find and transform the viewport within the cloned element
    const clonedViewport = clonedReactFlow.querySelector('.react-flow__viewport') as HTMLElement;
    if (clonedViewport) {
      const [x, y, zoom] = transform;
      clonedViewport.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    }
    
    exportContainer.appendChild(clonedReactFlow);

    // Use html2canvas on the export container
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(exportContainer, {
        backgroundColor: currentBgColor,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: imageWidth,
        height: imageHeight,
        ignoreElements: (element) => {
          // Ignore controls, minimap, and panels for cleaner export
          return element.classList.contains('react-flow__controls') ||
                 element.classList.contains('react-flow__minimap') ||
                 element.classList.contains('react-flow__panel');
        }
      }).then((canvas) => {
        // Create download link
        const link = document.createElement('a');
        const themeSuffix = isDarkMode ? '_dark' : '_light';
        link.download = `${diagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_diagram${themeSuffix}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Cleanup
        document.body.removeChild(exportContainer);
      }).catch((error) => {
        console.error('Failed to export image:', error);
        document.body.removeChild(exportContainer);
        alert('Image export failed. Please try the JSON export instead.');
      });
    }).catch(() => {
      document.body.removeChild(exportContainer);
      alert('Image export not available. Please use the JSON export instead.');
    });
  }, [getNodes, diagram.title, onExportImage]);

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
        diagramType: diagram.type, // Pass diagram type for styling
      },
    }));
  }, [diagram.nodes, diagram.type]);

  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(diagram.nodes.map(node => node.id));
    
    const processedEdges = diagram.edges
      .filter((edge) => {
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
        sourceHandle: 'output',
        targetHandle: 'input',
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: diagram.type === 'orgchart' ? 16 : 20,
          height: diagram.type === 'orgchart' ? 16 : 20,
          color: edge.color || '#6b7280',
        },
        style: {
          stroke: edge.color || '#6b7280',
          strokeWidth: edge.strokeWidth || 2,
          strokeDasharray: edge.dashed ? '5,5' : 'none',
        },
        // Remove labels for org charts to keep them clean
        label: diagram.type === 'orgchart' ? undefined : edge.label,
        labelStyle: diagram.type === 'orgchart' ? undefined : { 
          fontSize: 12, 
          fontWeight: 500,
          fill: edge.color || '#6b7280',
        },
        labelBgStyle: diagram.type === 'orgchart' ? undefined : { 
          fill: '#ffffff', 
          fillOpacity: 0.8,
          rx: 4,
          ry: 4,
        },
      }));
    
    return processedEdges;
  }, [diagram.edges, diagram.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const resetLayout = () => {
    const layoutNodes = diagram.nodes.map((node, index) => ({
      ...nodes.find(n => n.id === node.id)!,
      position: node.position || { 
        x: (index % 3) * 200 + 100, 
        y: Math.floor(index / 3) * 150 + 100 
      },
      data: {
        ...nodes.find(n => n.id === node.id)!.data,
        diagramType: diagram.type, // Preserve diagram type
      },
    }));
    setNodes(layoutNodes);
    setTimeout(() => fitView({ duration: 800 }), 100);
    // When user manually resets layout, mark as applied to prevent auto-layout interference
    hasAutoLayoutApplied.current = true;
  };

  const applyAutoLayout = useCallback(() => {
    let layoutedNodes: Node[];
    let layoutedEdges: Edge[];

    if (diagram.type === 'orgchart') {
      // Use specialized org chart layout
      const layoutOptions = getLayoutOptionsForDiagramType(diagram.type, diagram.nodes.length);
      const result = getOrgChartLayout(nodes, edges, layoutOptions);
      layoutedNodes = result.nodes;
      layoutedEdges = result.edges;
      setEdges(layoutedEdges);
    } else {
      // Use general layout for other diagram types
      const layoutOptions = getLayoutOptionsForDiagramType(diagram.type, diagram.nodes.length);
      const result = getLayoutedElements(nodes, edges, layoutOptions);
      layoutedNodes = result.nodes;
    }
    
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ duration: 800 }), 100);
    // When user manually applies layout, mark as applied to prevent auto-layout interference
    hasAutoLayoutApplied.current = true;
  }, [nodes, edges, diagram.type, diagram.nodes.length, setNodes, setEdges, fitView]);

  const applyRadialLayout = useCallback(() => {
    const { nodes: layoutedNodes } = getRadialLayout(nodes, edges);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ duration: 800 }), 100);
    // When user manually applies layout, mark as applied to prevent auto-layout interference
    hasAutoLayoutApplied.current = true;
  }, [nodes, edges, setNodes, fitView]);

  // Auto-apply layout after initial render for better organization - but only once
  useEffect(() => {
    // Only apply auto-layout if it hasn't been applied yet
    if (hasAutoLayoutApplied.current) {
      return;
    }

    const timer = setTimeout(() => {
      // For org charts, always apply auto-layout for better hierarchy
      // For other diagrams, only auto-layout if nodes don't have custom positions
      const hasCustomPositions = diagram.nodes.some(node => node.position);
      const shouldAutoLayout = diagram.type === 'orgchart' || (!hasCustomPositions && nodes.length > 1);
      
      if (shouldAutoLayout && nodes.length > 1) {
        applyAutoLayout();
        hasAutoLayoutApplied.current = true; // Mark as applied
      }
    }, diagram.type === 'orgchart' ? 500 : 1000); // Faster for org charts

    return () => clearTimeout(timer);
  }, [diagram.nodes, nodes.length, diagram.type]); // Removed applyAutoLayout from dependencies

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-gray-50 dark:bg-gray-900"
    >
      <Background 
        variant={backgroundVariant} 
        gap={20} 
        size={1}
        className="bg-gray-50 dark:bg-gray-900"
      />
      
      <Controls 
        className="bg-textured border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        showInteractive={false}
      />
      
      {showMiniMap && (
        <MiniMap
          className="bg-textured border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
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

      <Panel position="top-right" className="bg-textured rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={applyAutoLayout}
              className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 bg-blue-50 dark:bg-blue-950/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              title="Auto Layout"
            >
              <Shuffle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={applyRadialLayout}
              className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 bg-purple-50 dark:bg-purple-950/20 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
              title="Radial Layout"
            >
              <Circle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </button>
          </div>
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
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`p-2 rounded-lg transition-colors ${
                showMiniMap 
                  ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title="Toggle Mini Map"
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={exportImage}
              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 bg-green-50 dark:bg-green-950/20 rounded-lg transition-colors border border-green-200 dark:border-green-800"
              title="Export as Image"
            >
              <Camera className="h-4 w-4 text-green-600 dark:text-green-400" />
            </button>
          </div>
        </div>
      </Panel>
    </ReactFlow>
  );
};

const InteractiveDiagramBlock: React.FC<InteractiveDiagramBlockProps> = ({ diagram }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);

  const exportDiagramJSON = () => {
    const exportData = {
      title: diagram.title,
      nodes: diagram.nodes.map(node => ({
        id: node.id,
        label: node.label,
        position: node.position,
        type: node.nodeType || node.type,
      })),
      edges: diagram.edges.map(edge => ({
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

  // Function to handle image export from DiagramFlow
  const handleExportImage = useCallback(() => {
    const reactFlowInstance = document.querySelector('.react-flow');
    if (!reactFlowInstance) return;

    // Get the React Flow viewport element
    const viewport = reactFlowInstance.querySelector('.react-flow__viewport');
    if (!viewport) return;

    // Use html2canvas to capture the diagram
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(viewport as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
      }).then((canvas) => {
        // Create download link
        const link = document.createElement('a');
        link.download = `${diagram.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_diagram.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch((error) => {
        console.error('Failed to export image:', error);
        // Fallback: show message to user
        alert('Image export failed. Please try the JSON export instead.');
      });
    }).catch(() => {
      // html2canvas not available, show message
      alert('Image export not available. Please use the JSON export instead.');
    });
  }, [diagram.title]);

  const getDiagramIcon = () => {
    switch (diagram.type) {
      case 'flowchart': return <GitBranch className="h-4 w-4" />;
      case 'mindmap': return <Sparkles className="h-4 w-4" />;
      case 'orgchart': return <Users className="h-4 w-4" />;
      case 'network': return <Network className="h-4 w-4" />;
      case 'system': return <Server className="h-4 w-4" />;
      case 'process': return <Settings className="h-4 w-4" />;
      default: return <Network className="h-4 w-4" />;
    }
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

      <div className={`w-full ${isFullScreen ? 'fixed inset-0 z-50 flex items-center justify-center p-4' : 'py-4'}`}>
        <div className={`max-w-7xl mx-auto ${isFullScreen ? 'bg-textured rounded-2xl shadow-2xl h-full max-h-[95vh] w-full flex flex-col overflow-hidden' : ''}`}>
          
          {/* Header */}
          <div className={`${isFullScreen ? 'flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700' : ''}`}>
            <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 rounded-2xl p-4 shadow-lg border-2 border-blue-200 dark:border-blue-800/50">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 dark:bg-blue-600 rounded-lg shadow-md">
                    {getDiagramIcon()}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {diagram.title}
                    </h1>
                    {diagram.description && (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-1">
                        {diagram.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                        {formatDiagramType(diagram.type)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {!isFullScreen && (
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-blue-500 dark:bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all"
                      title="Fullscreen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  )}
                  {isFullScreen && (
                    <button
                      onClick={() => setIsFullScreen(false)}
                      className="flex items-center justify-center gap-2 px-2 py-2 rounded-lg bg-textured hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all shadow-sm border border-gray-200 dark:border-gray-600"
                      title="Exit Fullscreen"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={exportDiagramJSON}
                    className="flex items-center justify-center gap-2 px-2 py-2 bg-textured hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 transition-colors"
                    title="Export as JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ReactFlow Container */}
          <div className={`${isFullScreen ? 'flex-1' : 'h-[600px] mt-4'} bg-textured rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}>
            <ReactFlowProvider>
              <DiagramFlow 
                diagram={diagram}
                showMiniMap={showMiniMap}
                setShowMiniMap={setShowMiniMap}
                backgroundVariant={backgroundVariant}
                setBackgroundVariant={setBackgroundVariant}
                onExportImage={handleExportImage}
              />
            </ReactFlowProvider>
          </div>

          {/* Dynamic Legend */}
          {(() => {
            // For org charts, don't show a legend since they use role-based icons
            if (diagram.type === 'orgchart') {
              return null;
            }

            // Get unique node types actually used in the diagram
            const usedNodeTypes = new Set(
              diagram.nodes.map(node => node.nodeType || node.type || 'default')
            );

            // Define all possible legend items
            const allLegendItems = [
              { type: 'start', label: 'Start', color: 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300', icon: CheckCircle2 },
              { type: 'process', label: 'Process', color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300', icon: Settings },
              { type: 'decision', label: 'Decision', color: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300', icon: GitBranch },
              { type: 'data', label: 'Data', color: 'bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300', icon: Database },
              { type: 'end', label: 'End', color: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300', icon: XCircle },
              { type: 'user', label: 'User', color: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300', icon: Users },
              { type: 'system', label: 'System', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: Server },
              { type: 'api', label: 'API', color: 'bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300', icon: Globe },
              { type: 'compute', label: 'Compute', color: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300', icon: Cpu },
              { type: 'storage', label: 'Storage', color: 'bg-pink-100 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300', icon: HardDrive },
              { type: 'default', label: 'Node', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: Square },
            ];

            // Filter to only show legend items for node types actually used
            const relevantLegendItems = allLegendItems.filter(item => usedNodeTypes.has(item.type));

            // Don't render legend if no relevant items or only default nodes
            if (relevantLegendItems.length === 0 || (relevantLegendItems.length === 1 && relevantLegendItems[0].type === 'default')) {
              return null;
            }

            return (
              <div className={`${isFullScreen ? 'flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700' : 'mt-4'}`}>
                <div className="bg-textured rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className={`grid gap-3 ${relevantLegendItems.length <= 2 ? 'grid-cols-2' : relevantLegendItems.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-5'}`}>
                    {relevantLegendItems.map(({ type, label, color, icon: Icon }) => (
                      <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color} text-xs font-medium`}>
                        <Icon className="h-3 w-3" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
};

export default InteractiveDiagramBlock;