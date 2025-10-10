import dagre from 'dagre';
import { Node, Edge, Position, MarkerType } from 'reactflow';

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

/**
 * Applies automatic layout to ReactFlow nodes and edges using Dagre
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
) => {
  const {
    direction = 'TB',
    nodeWidth = 200,
    nodeHeight = 100,
    rankSep = 100,
    nodeSep = 80,
  } = options;

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph configuration
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight 
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply the layout
  dagre.layout(dagreGraph);

  // Update node positions based on the layout
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre positions are centered, but ReactFlow positions are top-left
    const newNode = {
      ...node,
      targetPosition: getTargetPosition(direction),
      sourcePosition: getSourcePosition(direction),
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      data: {
        ...node.data, // Preserve all existing node data including diagramType
      },
    };

    return newNode;
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Gets the appropriate target position for handles based on layout direction
 */
const getTargetPosition = (direction: string): Position => {
  switch (direction) {
    case 'TB': return Position.Top;
    case 'BT': return Position.Bottom;
    case 'LR': return Position.Left;
    case 'RL': return Position.Right;
    default: return Position.Top;
  }
};

/**
 * Gets the appropriate source position for handles based on layout direction
 */
const getSourcePosition = (direction: string): Position => {
  switch (direction) {
    case 'TB': return Position.Bottom;
    case 'BT': return Position.Top;
    case 'LR': return Position.Right;
    case 'RL': return Position.Left;
    default: return Position.Bottom;
  }
};

/**
 * Gets optimal layout options based on diagram type
 */
export const getLayoutOptionsForDiagramType = (
  diagramType: string,
  nodeCount: number
): LayoutOptions => {
  const baseOptions: LayoutOptions = {
    nodeWidth: 200,
    nodeHeight: 100,
    rankSep: 100,
    nodeSep: 80,
  };

  switch (diagramType) {
    case 'flowchart':
    case 'process':
      return {
        ...baseOptions,
        direction: 'TB',
        rankSep: 120,
        nodeSep: 100,
      };
    
    case 'orgchart':
      return {
        ...baseOptions,
        direction: 'TB',
        rankSep: 200,  // More vertical space for org charts
        nodeSep: 150,  // More horizontal space between peers
        nodeWidth: 220,  // Wider nodes for names/titles
        nodeHeight: 120, // Taller nodes for better text layout
      };
    
    case 'mindmap':
      return {
        ...baseOptions,
        direction: nodeCount > 10 ? 'LR' : 'TB',
        rankSep: 80,
        nodeSep: 60,
      };
    
    case 'network':
    case 'system':
      return {
        ...baseOptions,
        direction: 'LR',
        rankSep: 150,
        nodeSep: 100,
      };
    
    default:
      return {
        ...baseOptions,
        direction: 'TB',
      };
  }
};

/**
 * Applies a more organic layout for specific diagram types like mindmaps
 */
export const getRadialLayout = (
  nodes: Node[],
  edges: Edge[],
  centerNodeId?: string
): { nodes: Node[]; edges: Edge[] } => {
  if (nodes.length === 0) return { nodes, edges };

  // Find the center node (root node with most connections or specified center)
  let centerNode = centerNodeId 
    ? nodes.find(n => n.id === centerNodeId)
    : findCenterNode(nodes, edges);

  if (!centerNode) centerNode = nodes[0];

  const centerX = 400;
  const centerY = 300;
  const radius = 200;
  const angleStep = (2 * Math.PI) / (nodes.length - 1);

  const layoutedNodes = nodes.map((node, index) => {
    if (node.id === centerNode!.id) {
      return {
        ...node,
        position: { x: centerX, y: centerY },
      };
    }

    const adjustedIndex = index > nodes.findIndex(n => n.id === centerNode!.id) ? index - 1 : index;
    const angle = adjustedIndex * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return {
      ...node,
      position: { x: x - 100, y: y - 50 }, // Offset for node size
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Finds the node with the most connections (likely the center/root node)
 */
const findCenterNode = (nodes: Node[], edges: Edge[]): Node | undefined => {
  const connectionCounts = new Map<string, number>();
  
  // Initialize counts
  nodes.forEach(node => {
    connectionCounts.set(node.id, 0);
  });

  // Count connections
  edges.forEach(edge => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  });

  // Find node with most connections
  let maxConnections = 0;
  let centerNodeId = '';
  
  connectionCounts.forEach((count, nodeId) => {
    if (count > maxConnections) {
      maxConnections = count;
      centerNodeId = nodeId;
    }
  });

  return nodes.find(node => node.id === centerNodeId);
};

/**
 * Optimizes layout specifically for org charts by ensuring proper hierarchy
 */
export const getOrgChartLayout = (
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } => {
  const {
    direction = 'TB',
    nodeWidth = 220,
    nodeHeight = 120,
    rankSep = 200,
    nodeSep = 150,
  } = options;

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph configuration optimized for org charts
  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: rankSep,
    nodesep: nodeSep,
    marginx: 40,
    marginy: 40,
    align: 'UL', // Align nodes to upper left for better org chart look
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight 
    });
  });

  // Add edges to the graph (for org charts, edges should flow from manager to subordinate)
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Apply the layout
  dagre.layout(dagreGraph);

  // Update node positions based on the layout
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    const newNode = {
      ...node,
      targetPosition: Position.Top,    // Connections come from above
      sourcePosition: Position.Bottom, // Connections go down to subordinates
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      data: {
        ...node.data,
        diagramType: 'orgchart', // Ensure org chart styling is preserved
      },
    };

    return newNode;
  });

  // Clean up edges for org charts - remove labels and improve styling
  const cleanedEdges = edges.map(edge => ({
    ...edge,
    label: undefined, // Remove "reports to" labels
    labelStyle: undefined,
    labelBgStyle: undefined,
    style: {
      ...edge.style,
      stroke: '#6b7280',
      strokeWidth: 2,
      strokeDasharray: 'none',
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: '#6b7280',
    },
  }));

  return { nodes: layoutedNodes, edges: cleanedEdges };
};
