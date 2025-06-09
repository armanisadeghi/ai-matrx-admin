import { Edge } from "reactflow";
import { deleteWorkflowEdge } from "@/features/workflows/service/workflowService";

export interface DuplicateEdgeGroup {
  signature: string;
  edges: Edge[];
  keepEdge: Edge;
  duplicateEdges: Edge[];
}

/**
 * Identifies duplicate edges based on source, target, and connection properties
 */
export function identifyDuplicateEdges(edges: Edge[]): DuplicateEdgeGroup[] {
  // Filter out virtual edges - they shouldn't be in the database anyway
  const databaseEdges = edges.filter(edge => !edge.id?.startsWith('virtual_'));
  
  // Group edges by their "signature" (source + target + connection type)
  const edgeGroups = new Map<string, Edge[]>();
  
  databaseEdges.forEach(edge => {
    const signature = `${edge.source}->${edge.target}:${edge.data?.connectionType || 'manual'}`;
    if (!edgeGroups.has(signature)) {
      edgeGroups.set(signature, []);
    }
    edgeGroups.get(signature)!.push(edge);
  });
  
  // Find groups with duplicates
  const duplicateGroups: DuplicateEdgeGroup[] = [];
  
  edgeGroups.forEach((groupEdges, signature) => {
    if (groupEdges.length > 1) {
      // Sort by creation date if available, otherwise keep first one
      const sortedEdges = groupEdges.sort((a, b) => {
        // Prefer edges with data (more detailed) over those without
        if (a.data && !b.data) return -1;
        if (!a.data && b.data) return 1;
        
        // If both have data or both don't, sort by ID (usually creation order)
        return a.id.localeCompare(b.id);
      });
      
      const keepEdge = sortedEdges[0];
      const duplicateEdges = sortedEdges.slice(1);
      
      duplicateGroups.push({
        signature,
        edges: groupEdges,
        keepEdge,
        duplicateEdges
      });
    }
  });
  
  return duplicateGroups;
}

/**
 * Removes duplicate edges from the database
 */
export async function removeDuplicateEdges(duplicateGroups: DuplicateEdgeGroup[]): Promise<void> {
  const deletePromises: Promise<void>[] = [];
  
  duplicateGroups.forEach(group => {
    group.duplicateEdges.forEach(edge => {
      deletePromises.push(deleteWorkflowEdge(edge.id));
    });
  });
  
  await Promise.all(deletePromises);
}

/**
 * Removes all edges connected to a specific node from the database
 * This should be called when a node is deleted to prevent orphaned edges
 */
export async function removeEdgesForNode(nodeId: string, edges: Edge[]): Promise<void> {
  // Find all database edges connected to this node (exclude virtual edges)
  const connectedEdges = edges.filter(edge => 
    !edge.id?.startsWith('virtual_') && 
    (edge.source === nodeId || edge.target === nodeId)
  );
  
  if (connectedEdges.length === 0) {
    return;
  }
  
  console.log(`🧹 Cleaning up ${connectedEdges.length} database edges for deleted node ${nodeId}`);
  
  // Delete all connected edges from database
  const deletePromises = connectedEdges.map(edge => deleteWorkflowEdge(edge.id));
  await Promise.all(deletePromises);
  
  console.log(`✅ Successfully deleted ${connectedEdges.length} edges for node ${nodeId}`);
}

/**
 * Gets a summary of duplicate edges for display
 */
export function getDuplicateSummary(duplicateGroups: DuplicateEdgeGroup[]): {
  totalDuplicates: number;
  affectedConnections: number;
  duplicatesByType: Record<string, number>;
} {
  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicateEdges.length, 0);
  const affectedConnections = duplicateGroups.length;
  
  const duplicatesByType: Record<string, number> = {};
  
  duplicateGroups.forEach(group => {
    group.duplicateEdges.forEach(edge => {
      const type = edge.data?.connectionType || 'manual';
      duplicatesByType[type] = (duplicatesByType[type] || 0) + 1;
    });
  });
  
  return {
    totalDuplicates,
    affectedConnections,
    duplicatesByType
  };
} 