"use client";
import React, { useMemo } from "react";
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
} from "reactflow";
import QuickAccessPanel from "@/features/workflows/react-flow/core/QuickAccessPanel";
import CustomEdge from "@/features/workflows/edges/CustomEdge";
import { useTheme } from "@/styles/themes/ThemeProvider";

// Define edge types outside component to avoid memoization warning
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  nodeTypes: NodeTypes;
  onAddNode: (id: string, type?: string) => void;
  mode?: 'edit' | 'view' | 'execute';
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  nodeTypes,
  onAddNode,
  mode = 'edit',
}) => {
  const { mode: themeMode } = useTheme();

  // Debug: Log edges and nodes to console


  // Default edge options - memoized to avoid recreating
  const defaultEdgeOptions = useMemo(() => ({
    animated: false,
    type: 'custom',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'hsl(var(--primary))',
    },
  }), []);
  
  return (
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
          maxZoom: 1.5
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={mode === 'edit'}
        nodesConnectable={mode === 'edit'}
        elementsSelectable={mode === 'edit'}
        edgesFocusable={mode === 'edit'}
      >
        <Controls
          position="bottom-left"
          showInteractive={false}
          style={{ bottom: 10, left: 10 }}
        />
        
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.type === 'userInput') return "#10b981";
            if (node.data?.type === 'brokerRelay') return "#3b82f6";
            if (node.data?.execution_required) return "#ef4444";
            return themeMode === "dark" ? "#475569" : "#d1d5db";
          }}
          maskColor={themeMode === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(240, 240, 240, 0.4)"}
          style={{
            backgroundColor: themeMode === "dark" ? "#1e293b" : "#f9fafb",
            border: themeMode === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
          }}
        />
        
        <Background
          gap={12}
          size={1}
          color={themeMode === "dark" ? "#334155" : "#e5e7eb"}
          style={{ backgroundColor: themeMode === "dark" ? "#1e293b" : "#f9fafb" }}
        />

        {mode === 'edit' && (
          <Panel position="top-right">
            <QuickAccessPanel onAddNode={onAddNode} />
          </Panel>
        )}
        
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
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
              <circle 
                stroke="hsl(var(--primary))" 
                strokeOpacity="0.75" 
                r="2" 
                cx="0" 
                cy="0" 
                fill="hsl(var(--primary))"
              />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
    </div>
  );
};

export default WorkflowCanvas;