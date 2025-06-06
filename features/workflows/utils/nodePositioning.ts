import { Node, Viewport } from 'reactflow';

// Standard node dimensions (approximate)
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const MIN_SPACING = 50;

/**
 * Calculate an intelligent position for a new node
 * @param existingNodes - Array of existing nodes to avoid overlapping
 * @param viewport - Current viewport state (zoom, pan)
 * @returns Position object with x, y coordinates
 */
export function getIntelligentNodePosition(
  existingNodes: Node[],
  viewport?: Viewport
): { x: number; y: number } {
  // Get viewport center, fallback to origin if not provided
  const viewportCenter = viewport 
    ? {
        x: (-viewport.x + window.innerWidth / 2) / viewport.zoom,
        y: (-viewport.y + window.innerHeight / 2) / viewport.zoom
      }
    : { x: 0, y: 0 };

  // If no existing nodes, place at viewport center
  if (existingNodes.length === 0) {
    return {
      x: viewportCenter.x - NODE_WIDTH / 2,
      y: viewportCenter.y - NODE_HEIGHT / 2
    };
  }

  // Try to find a position near the viewport center that doesn't overlap
  const attempts = [
    // Center
    { x: viewportCenter.x - NODE_WIDTH / 2, y: viewportCenter.y - NODE_HEIGHT / 2 },
    // Right of center
    { x: viewportCenter.x + 50, y: viewportCenter.y - NODE_HEIGHT / 2 },
    // Below center
    { x: viewportCenter.x - NODE_WIDTH / 2, y: viewportCenter.y + 50 },
    // Left of center  
    { x: viewportCenter.x - NODE_WIDTH - 50, y: viewportCenter.y - NODE_HEIGHT / 2 },
    // Above center
    { x: viewportCenter.x - NODE_WIDTH / 2, y: viewportCenter.y - NODE_HEIGHT - 50 },
    // Diagonal positions
    { x: viewportCenter.x + 50, y: viewportCenter.y + 50 },
    { x: viewportCenter.x - NODE_WIDTH - 50, y: viewportCenter.y + 50 },
    { x: viewportCenter.x + 50, y: viewportCenter.y - NODE_HEIGHT - 50 },
    { x: viewportCenter.x - NODE_WIDTH - 50, y: viewportCenter.y - NODE_HEIGHT - 50 }
  ];

  // Try each position and return the first one that doesn't overlap
  for (const position of attempts) {
    if (!isPositionOccupied(position, existingNodes)) {
      return position;
    }
  }

  // If all preferred positions are occupied, use spiral positioning
  return getSpiralPosition(existingNodes, viewportCenter);
}

/**
 * Check if a position would overlap with existing nodes
 */
function isPositionOccupied(
  position: { x: number; y: number },
  existingNodes: Node[]
): boolean {
  return existingNodes.some(node => {
    const nodeX = node.position.x;
    const nodeY = node.position.y;
    
    // Check if rectangles overlap (with padding)
    const overlap = !(
      position.x + NODE_WIDTH + MIN_SPACING < nodeX ||
      nodeX + NODE_WIDTH + MIN_SPACING < position.x ||
      position.y + NODE_HEIGHT + MIN_SPACING < nodeY ||
      nodeY + NODE_HEIGHT + MIN_SPACING < position.y
    );
    
    return overlap;
  });
}

/**
 * Generate a position using spiral pattern when preferred positions are occupied
 */
function getSpiralPosition(
  existingNodes: Node[],
  center: { x: number; y: number }
): { x: number; y: number } {
  const spacing = NODE_WIDTH + MIN_SPACING;
  let radius = spacing;
  let angle = 0;
  const angleIncrement = Math.PI / 4; // 45 degree increments

  // Spiral outward until we find an empty spot
  for (let attempt = 0; attempt < 50; attempt++) {
    const x = center.x + Math.cos(angle) * radius - NODE_WIDTH / 2;
    const y = center.y + Math.sin(angle) * radius - NODE_HEIGHT / 2;
    
    const position = { x, y };
    
    if (!isPositionOccupied(position, existingNodes)) {
      return position;
    }
    
    // Move to next position in spiral
    angle += angleIncrement;
    if (angle >= 2 * Math.PI) {
      angle = 0;
      radius += spacing * 0.5; // Increase radius for next ring
    }
  }

  // Fallback: place far to the right if spiral fails
  return {
    x: center.x + 500,
    y: center.y - NODE_HEIGHT / 2
  };
}

/**
 * Get grid position for multiple nodes being added at once
 */
export function getGridPosition(
  index: number,
  startPosition: { x: number; y: number },
  columns: number = 3
): { x: number; y: number } {
  const row = Math.floor(index / columns);
  const col = index % columns;
  
  return {
    x: startPosition.x + col * (NODE_WIDTH + MIN_SPACING),
    y: startPosition.y + row * (NODE_HEIGHT + MIN_SPACING)
  };
} 