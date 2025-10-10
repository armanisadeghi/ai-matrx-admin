interface DiagramNode {
  id: string;
  label: string;
  type?: string;
  nodeType?: string;
  description?: string;
  details?: string;
  position?: { x: number; y: number };
}

interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  color?: string;
  dashed?: boolean;
  strokeWidth?: number;
}

interface DiagramData {
  title: string;
  description?: string;
  type: 'flowchart' | 'mindmap' | 'orgchart' | 'network' | 'system' | 'process';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  layout?: {
    direction?: 'TB' | 'LR' | 'BT' | 'RL';
    spacing?: number;
  };
}

/**
 * Parses JSON content into structured diagram data
 * 
 * Expected JSON format (flexible edge format supported):
 * {
 *   "diagram": {
 *     "title": "System Architecture",
 *     "type": "flowchart",
 *     "nodes": [
 *       {
 *         "id": "start",
 *         "label": "Start Process",
 *         "nodeType": "start",
 *         "position": { "x": 100, "y": 50 }
 *       }
 *     ],
 *     "edges": [
 *       {
 *         "id": "edge1", // Optional - auto-generated if missing
 *         "source": "start", // Or use "from"
 *         "target": "process1", // Or use "to"
 *         "label": "Begin"
 *       }
 *     ]
 *   }
 * }
 */
export function parseDiagramJSON(content: string): DiagramData {
  try {
    // First, try to extract JSON from markdown code blocks
    let jsonContent = content.trim();
    
    // Remove markdown code block syntax if present
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
    }
    
    // Parse the JSON
    const parsed = JSON.parse(jsonContent);
    
    // Extract diagram data
    const diagramData = parsed.diagram || parsed;
    
    if (!diagramData) {
      throw new Error('No diagram data found in JSON');
    }
    
    // Validate required fields
    if (!diagramData.title || !diagramData.nodes || !Array.isArray(diagramData.nodes)) {
      throw new Error('Missing required fields: title or nodes array');
    }
    
    // Process nodes
    const processedNodes: DiagramNode[] = diagramData.nodes.map((node: any, index: number) => {
      if (!node.id || !node.label) {
        throw new Error(`Node ${index} missing required id or label`);
      }
      
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        nodeType: node.nodeType || node.type || 'default',
        description: node.description,
        details: node.details,
        position: node.position || generateDefaultPosition(index, diagramData.type || 'flowchart'),
      };
    });
    
    // Process edges
    const processedEdges: DiagramEdge[] = (diagramData.edges || []).map((edge: any, index: number) => {
      // Handle both from/to and source/target formats
      const source = edge.source || edge.from;
      const target = edge.target || edge.to;
      
      if (!source || !target) {
        throw new Error(`Edge ${index} missing required source/from or target/to field`);
      }
      
      // Auto-generate ID if not provided
      const id = edge.id || `edge_${source}_to_${target}_${index}`;
      
      return {
        id,
        source,
        target,
        label: edge.label,
        type: edge.type || 'default',
        color: edge.color,
        dashed: edge.dashed || false,
        strokeWidth: edge.strokeWidth || 2,
      };
    });
    
    return {
      title: diagramData.title,
      description: diagramData.description,
      type: diagramData.type || 'flowchart',
      nodes: processedNodes,
      edges: processedEdges,
      layout: diagramData.layout || { direction: 'TB', spacing: 100 },
    };
    
  } catch (error) {
    console.error('Error parsing diagram JSON:', error);
    throw new Error(`Failed to parse diagram JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates default position for a node based on diagram type
 */
function generateDefaultPosition(index: number, diagramType: string): { x: number; y: number } {
  switch (diagramType) {
    case 'flowchart':
    case 'process':
      // Vertical flow
      return { x: 250, y: index * 120 + 50 };
    
    case 'orgchart':
      // Hierarchical tree layout
      const level = Math.floor(index / 3);
      const position = index % 3;
      return { x: position * 200 + 100, y: level * 150 + 50 };
    
    case 'mindmap':
      // Radial layout
      const angle = (index * 2 * Math.PI) / 8;
      const radius = 200 + (Math.floor(index / 8) * 100);
      return {
        x: 300 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
      };
    
    case 'network':
      // Random but structured layout
      const cols = 4;
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        x: col * 180 + 100 + (row % 2) * 90,
        y: row * 140 + 80,
      };
    
    case 'system':
      // Grid layout
      const gridCols = 3;
      const gridRow = Math.floor(index / gridCols);
      const gridCol = index % gridCols;
      return {
        x: gridCol * 220 + 120,
        y: gridRow * 160 + 100,
      };
    
    default:
      // Default grid
      return {
        x: (index % 3) * 200 + 100,
        y: Math.floor(index / 3) * 150 + 100,
      };
  }
}

/**
 * Validates that the parsed diagram has the minimum required structure
 */
export function validateDiagram(diagram: DiagramData): boolean {
  if (!diagram.title || !diagram.nodes || !Array.isArray(diagram.nodes)) {
    return false;
  }
  
  // Validate nodes
  for (const node of diagram.nodes) {
    if (!node.id || !node.label) {
      return false;
    }
  }
  
  // Validate edges (if present)
  if (diagram.edges) {
    for (const edge of diagram.edges) {
      if (!edge.source || !edge.target) {
        return false;
      }
      
      // Check if source and target nodes exist
      const sourceExists = diagram.nodes.some(node => node.id === edge.source);
      const targetExists = diagram.nodes.some(node => node.id === edge.target);
      
      if (!sourceExists || !targetExists) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Creates a sample diagram for testing/demo purposes
 */
export function createSampleDiagram(): DiagramData {
  return {
    title: 'User Registration Process',
    description: 'Step-by-step flow for user registration and verification',
    type: 'flowchart',
    nodes: [
      {
        id: 'start',
        label: 'User Visits Page',
        nodeType: 'start',
        description: 'User lands on registration page',
        position: { x: 250, y: 50 },
      },
      {
        id: 'form',
        label: 'Fill Registration Form',
        nodeType: 'process',
        description: 'User enters personal information',
        position: { x: 250, y: 170 },
      },
      {
        id: 'validate',
        label: 'Validate Input',
        nodeType: 'decision',
        description: 'Check if all required fields are filled',
        position: { x: 250, y: 290 },
      },
      {
        id: 'error',
        label: 'Show Error',
        nodeType: 'process',
        description: 'Display validation errors',
        position: { x: 100, y: 410 },
      },
      {
        id: 'save',
        label: 'Save User Data',
        nodeType: 'data',
        description: 'Store user information in database',
        position: { x: 400, y: 410 },
      },
      {
        id: 'email',
        label: 'Send Verification Email',
        nodeType: 'system',
        description: 'Send confirmation email to user',
        position: { x: 400, y: 530 },
      },
      {
        id: 'success',
        label: 'Registration Complete',
        nodeType: 'end',
        description: 'User successfully registered',
        position: { x: 400, y: 650 },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'start',
        target: 'form',
        label: 'Navigate',
      },
      {
        id: 'e2',
        source: 'form',
        target: 'validate',
        label: 'Submit',
      },
      {
        id: 'e3',
        source: 'validate',
        target: 'error',
        label: 'Invalid',
        color: '#ef4444',
      },
      {
        id: 'e4',
        source: 'error',
        target: 'form',
        label: 'Retry',
        dashed: true,
      },
      {
        id: 'e5',
        source: 'validate',
        target: 'save',
        label: 'Valid',
        color: '#10b981',
      },
      {
        id: 'e6',
        source: 'save',
        target: 'email',
        label: 'Success',
      },
      {
        id: 'e7',
        source: 'email',
        target: 'success',
        label: 'Sent',
      },
    ],
    layout: {
      direction: 'TB',
      spacing: 120,
    },
  };
}

/**
 * Converts diagram data back to JSON format
 */
export function diagramToJSON(diagram: DiagramData): string {
  const jsonData = {
    diagram: {
      title: diagram.title,
      description: diagram.description,
      type: diagram.type,
      nodes: diagram.nodes.map(node => ({
        id: node.id,
        label: node.label,
        nodeType: node.nodeType,
        description: node.description,
        details: node.details,
        position: node.position,
      })),
      edges: diagram.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: edge.type,
        color: edge.color,
        dashed: edge.dashed,
        strokeWidth: edge.strokeWidth,
      })),
      layout: diagram.layout,
    },
  };
  
  return JSON.stringify(jsonData, null, 2);
}

/**
 * Calculates statistics about the diagram
 */
export function calculateDiagramStatistics(diagram: DiagramData): {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: Record<string, number>;
  complexity: 'simple' | 'moderate' | 'complex';
} {
  const stats = {
    totalNodes: diagram.nodes.length,
    totalEdges: diagram.edges.length,
    nodeTypes: {} as Record<string, number>,
    complexity: 'simple' as 'simple' | 'moderate' | 'complex',
  };
  
  // Count node types
  diagram.nodes.forEach(node => {
    const type = node.nodeType || 'default';
    stats.nodeTypes[type] = (stats.nodeTypes[type] || 0) + 1;
  });
  
  // Determine complexity
  const totalElements = stats.totalNodes + stats.totalEdges;
  if (totalElements > 20) {
    stats.complexity = 'complex';
  } else if (totalElements > 10) {
    stats.complexity = 'moderate';
  }
  
  return stats;
}

/**
 * Auto-generates edges for hierarchical diagrams
 */
export function autoGenerateEdges(nodes: DiagramNode[], diagramType: string): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  
  if (diagramType === 'orgchart') {
    // Generate hierarchical edges based on position
    const sortedNodes = [...nodes].sort((a, b) => (a.position?.y || 0) - (b.position?.y || 0));
    
    for (let i = 0; i < sortedNodes.length - 1; i++) {
      const currentLevel = Math.floor(i / 3);
      const nextLevel = Math.floor((i + 1) / 3);
      
      if (nextLevel > currentLevel) {
        edges.push({
          id: `auto-edge-${i}`,
          source: sortedNodes[i].id,
          target: sortedNodes[i + 1].id,
          type: 'default',
        });
      }
    }
  } else if (diagramType === 'flowchart') {
    // Generate sequential edges
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `flow-edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'default',
      });
    }
  }
  
  return edges;
}

/**
 * Attempts to parse either JSON or create from template
 */
export function parseDiagramContent(content: string): DiagramData {
  // First try to parse as JSON
  try {
    return parseDiagramJSON(content);
  } catch (jsonError) {
    // If JSON parsing fails, create a simple diagram
    console.warn('JSON parsing failed, creating simple diagram:', jsonError);
    
    return {
      title: 'Simple Diagram',
      description: 'Generated from content',
      type: 'flowchart',
      nodes: [
        {
          id: 'node1',
          label: 'Start',
          nodeType: 'start',
          position: { x: 250, y: 50 },
        },
        {
          id: 'node2',
          label: 'Process',
          nodeType: 'process',
          position: { x: 250, y: 170 },
        },
        {
          id: 'node3',
          label: 'End',
          nodeType: 'end',
          position: { x: 250, y: 290 },
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2',
        },
        {
          id: 'edge2',
          source: 'node2',
          target: 'node3',
        },
      ],
    };
  }
}
