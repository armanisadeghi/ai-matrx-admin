# React Flow 12 Expert Implementation Guide

## Package & Core Setup

```tsx
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
```

## Essential Hooks

### State Management
- `useNodesState(initialNodes)` → `[nodes, setNodes, onNodesChange]`
- `useEdgesState(initialEdges)` → `[edges, setEdges, onEdgesChange]`
- `useNodes()` → `Node[]` (re-renders on any node change)
- `useEdges()` → `Edge[]` (re-renders on any edge change)

### React Flow Instance
- `useReactFlow()` → `ReactFlowInstance` (no re-renders on state changes)

### Viewport Control
- `useViewport()` → `{ x: number, y: number, zoom: number }`
- `useOnViewportChange({ onStart, onChange, onEnd })`

### Node/Edge Connections (Computing Flows)
- `useHandleConnections({ type: 'target'|'source', id?: string })` → `Connection[]`
- `useNodeConnections({ type: 'target'|'source', handleId?: string })` → `NodeConnection[]`
- `useNodesData(nodeId | nodeIds[])` → `{ id, type, data }` or array

### Utilities
- `useConnection()` → current connection state during dragging
- `useNodeId()` → current node ID (inside node component)
- `useNodesInitialized()` → boolean (all nodes measured)
- `useUpdateNodeInternals()` → function to trigger handle recalculation

## ReactFlowInstance Methods

```tsx
const { 
  // Nodes
  getNode, getNodes, setNodes, addNodes,
  updateNode, updateNodeData,
  
  // Edges
  getEdge, getEdges, setEdges, addEdges,
  updateEdge, updateEdgeData,
  
  // Viewport
  fitView, zoomIn, zoomOut, zoomTo, setCenter,
  getViewport, setViewport,
  screenToFlowPosition, flowToScreenPosition,
  
  // Utilities
  deleteElements, toObject,
  getIntersectingNodes, isNodeIntersecting,
  getNodesBounds
} = useReactFlow();
```

## Node Definition

```tsx
interface Node<T = any> {
  id: string;
  type?: string;
  data: T;
  position: { x: number; y: number };
  
  // Sizing (v12 behavior change)
  width?: number;        // Sets fixed width via inline style
  height?: number;       // Sets fixed height via inline style
  measured?: {           // Measured dimensions (read-only)
    width: number;
    height: number;
  };
  
  // Hierarchy
  parentId?: string;     // Changed from parentNode in v11
  extent?: 'parent' | [[number, number], [number, number]];
  
  // Interaction
  selected?: boolean;
  dragging?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  
  // Styling
  style?: CSSProperties;
  className?: string;
  hidden?: boolean;
  zIndex?: number;
  
  // Source/Target positions for handles
  sourcePosition?: Position;
  targetPosition?: Position;
}
```

## Edge Definition

```tsx
interface Edge<T = any> {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  
  type?: string;
  data?: T;
  
  // Styling
  style?: CSSProperties;
  className?: string;
  animated?: boolean;
  hidden?: boolean;
  selected?: boolean;
  
  // Markers
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
  
  // Labels
  label?: string | ReactNode;
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
}
```

## Custom Node Implementation

```tsx
import { NodeProps, Handle, Position } from '@xyflow/react';

interface CustomNodeData {
  label: string;
  value: number;
}

function CustomNode({ id, data, selected }: NodeProps<Node<CustomNodeData>>) {
  const { updateNodeData } = useReactFlow();
  
  const handleChange = useCallback((newValue: number) => {
    updateNodeData(id, { value: newValue });
  }, [id, updateNodeData]);

  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      
      <div className="node-content">
        <label>{data.label}</label>
        <input 
          type="number"
          value={data.value}
          onChange={(e) => handleChange(parseInt(e.target.value))}
          className="nodrag" // Prevents node dragging when interacting
        />
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// Register node type
const nodeTypes = useMemo(() => ({
  custom: CustomNode,
}), []);
```

## Handle Component

```tsx
<Handle
  type="source" | "target"
  position={Position.Top | Position.Right | Position.Bottom | Position.Left}
  id="handle-id"              // For multiple handles
  style={{ background: '#555' }}
  isConnectable={true}
  onConnect={(params) => console.log('connect', params)}
  isValidConnection={(connection) => connection.source !== connection.target}
/>
```

## Computing Flows Pattern

```tsx
// Source node: updates data
function InputNode({ id }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  
  const handleChange = (value: number) => {
    updateNodeData(id, { value });
  };
  
  return (
    <div>
      <input onChange={(e) => handleChange(+e.target.value)} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// Target node: reads connected data
function OutputNode(): NodeProps {
  const connections = useHandleConnections({ type: 'target' });
  const nodeData = useNodesData(connections?.[0]?.source);
  
  return (
    <div>
      <Handle type="target" position={Position.Left} />
      <div>Value: {nodeData?.data?.value ?? 'No input'}</div>
    </div>
  );
}
```

## Viewport Control

```tsx
// Controlled viewport
const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

<ReactFlow 
  viewport={viewport}
  onViewportChange={setViewport}
/>

// Programmatic viewport control
const { fitView, zoomTo, setCenter } = useReactFlow();

fitView({ duration: 800, padding: 0.1 });
zoomTo(1.5, { duration: 500 });
setCenter(200, 300, { zoom: 1.2 });
```

## Event Handlers

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  
  // Node events
  onNodeClick={(event, node) => {}}
  onNodeDoubleClick={(event, node) => {}}
  onNodeMouseEnter={(event, node) => {}}
  onNodeMouseLeave={(event, node) => {}}
  onNodeDragStart={(event, node) => {}}
  onNodeDrag={(event, node) => {}}
  onNodeDragStop={(event, node) => {}}
  
  // Edge events  
  onEdgeClick={(event, edge) => {}}
  onEdgeDoubleClick={(event, edge) => {}}
  onEdgeMouseEnter={(event, edge) => {}}
  onEdgeMouseLeave={(event, edge) => {}}
  
  // Selection
  onSelectionChange={({ nodes, edges }) => {}}
  onSelectionDragStart={(event, nodes) => {}}
  onSelectionDrag={(event, nodes) => {}}
  onSelectionDragStop={(event, nodes) => {}}
  
  // Pane events
  onPaneClick={(event) => {}}
  onPaneContextMenu={(event) => {}}
  onPaneScroll={(event) => {}}
  
  // Connection events
  onConnectStart={(event, { nodeId, handleType }) => {}}
  onConnectEnd={(event) => {}}
  onReconnect={(oldEdge, newConnection) => {}} // v12: renamed from onEdgeUpdate
  onReconnectStart={(event, edge) => {}}
  onReconnectEnd={(event, edge) => {}}
  
  // Deletion
  onDelete={({ nodes, edges }) => {}} // v12: combined handler
  onBeforeDelete={({ nodes, edges }) => boolean} // v12: prevent deletions
/>
```

## Interaction Props

```tsx
<ReactFlow
  // Node interaction
  nodesDraggable={true}
  nodesConnectable={true}
  nodesFocusable={true}
  
  // Edge interaction  
  edgesReconnectable={true}
  edgesFocusable={true}
  
  // Selection
  elementsSelectable={true}
  selectNodesOnDrag={true}
  
  // Panning & Zooming
  panOnDrag={true}
  panOnScroll={false}
  panOnScrollMode="free" // "free" | "vertical" | "horizontal"
  zoomOnScroll={true}
  zoomOnPinch={true}
  zoomOnDoubleClick={true}
  preventScrolling={true}
  
  // Keyboard
  deleteKeyCode="Backspace"
  selectionKeyCode="Shift"
  multiSelectionKeyCode="Meta"
  
  // Connection
  connectionMode="strict" // "strict" | "loose"
  isValidConnection={(connection) => boolean}
  
  // CSS classes for interaction
  noDragClassName="nodrag"
  noWheelClassName="nowheel"
  noPanClassName="nopan"
/>
```

## Theming & Styling

```tsx
// Built-in dark mode
<ReactFlow 
  colorMode="dark" // "light" | "dark" | "system"
/>

// CSS Variables (customize in CSS)
:root {
  --xy-node-background-color-default: #fff;
  --xy-node-border-default: 1px solid #1a192b;
  --xy-edge-stroke-default: #b1b1b7;
  --xy-handle-background-color-default: #1a192b;
  --xy-selection-background-color-default: rgba(0, 89, 220, 0.08);
  --xy-controls-button-background-color-default: #fefefe;
  --xy-minimap-background-color-default: #fff;
}

.dark {
  --xy-node-background-color-default: #2d2d2d;
  --xy-edge-stroke-default: #666;
}
```

## Built-in Components

```tsx
import { 
  Background, 
  Controls, 
  MiniMap, 
  Panel,
  NodeToolbar,
  NodeResizer,
  ViewportPortal
} from '@xyflow/react';

<ReactFlow>
  <Background 
    variant="dots" // "dots" | "lines" | "cross"
    gap={16}
    size={0.5}
    color="#f1f1f1"
    patternClassName="bg-pattern"
  />
  
  <Controls 
    position="bottom-right"
    showZoom={true}
    showFitView={true}
    showInteractive={true}
  />
  
  <MiniMap 
    position="bottom-left"
    nodeColor={(node) => node.style?.backgroundColor || '#fff'}
    nodeStrokeColor="#fff"
    nodeStrokeWidth={3}
    maskColor="rgba(0,0,0,0.1)"
    zoomable
    pannable
  />
  
  <Panel position="top-left">
    <div>Custom toolbar content</div>
  </Panel>
</ReactFlow>

// Node-specific components (inside custom nodes)
<NodeToolbar isVisible={selected} position="top">
  <button>Edit</button>
  <button>Delete</button>
</NodeToolbar>

<NodeResizer 
  minWidth={100}
  minHeight={50}
  isVisible={selected}
  handleStyle={{ backgroundColor: '#fff' }}
/>

// Viewport Portal (renders in flow coordinate system)
<ViewportPortal>
  <div style={{ 
    position: 'absolute',
    transform: 'translate(100px, 100px)',
    background: 'white'
  }}>
    Positioned at flow coordinates [100, 100]
  </div>
</ViewportPortal>
```

## Performance Optimization

```tsx
// Memoize node/edge types
const nodeTypes = useMemo(() => ({
  custom: memo(CustomNode),
  input: memo(InputNode),
}), []);

const edgeTypes = useMemo(() => ({
  custom: memo(CustomEdge),
}), []);

// Memoize event handlers  
const onNodesChange = useCallback((changes) => {
  setNodes((nds) => applyNodeChanges(changes, nds));
}, [setNodes]);

const onConnect = useCallback((connection) => {
  setEdges((eds) => addEdge(connection, eds));
}, [setEdges]);

// Only render visible elements for large flows
<ReactFlow 
  onlyRenderVisibleElements={true}
  nodeExtent={[[-1000, -1000], [1000, 1000]]}
/>
```

## TypeScript Patterns

```tsx
import { Node, Edge, NodeProps, EdgeProps } from '@xyflow/react';

// Custom node data types
type InputNodeData = { value: number; label: string };
type OutputNodeData = { result: string };

type CustomNode = Node<InputNodeData, 'input'> | Node<OutputNodeData, 'output'>;
type CustomEdge = Edge<{ weight: number }, 'custom'>;

// Typed components
const InputNode = ({ data }: NodeProps<Node<InputNodeData>>) => {
  return <div>{data.value}</div>;
};

// Typed hooks
const reactFlow = useReactFlow<CustomNode, CustomEdge>();
const nodes = useNodes<CustomNode>();
const edges = useEdges<CustomEdge>();
```

## Advanced Patterns

### Dynamic Handles
```tsx
const DynamicNode = ({ id }: NodeProps) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const [handleCount, setHandleCount] = useState(2);
  
  const addHandle = () => {
    setHandleCount(prev => prev + 1);
    // Update internals after handle changes
    setTimeout(() => updateNodeInternals(id), 0);
  };
  
  return (
    <div>
      {Array.from({ length: handleCount }, (_, i) => (
        <Handle 
          key={i}
          id={`handle-${i}`}
          type="source" 
          position={Position.Right}
          style={{ top: `${20 + i * 20}px` }}
        />
      ))}
      <button onClick={addHandle}>Add Handle</button>
    </div>
  );
};
```

### Connection Validation
```tsx
const isValidConnection = useCallback((connection: Connection) => {
  const { source, target, sourceHandle, targetHandle } = connection;
  
  // Prevent self-connections
  if (source === target) return false;
  
  // Check handle compatibility
  if (sourceHandle === 'data' && targetHandle !== 'data') return false;
  
  // Check for existing connections
  const hasConnection = edges.some(edge => 
    edge.source === source && 
    edge.target === target &&
    edge.sourceHandle === sourceHandle &&
    edge.targetHandle === targetHandle
  );
  
  return !hasConnection;
}, [edges]);
```