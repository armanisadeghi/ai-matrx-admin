import { Edge } from "reactflow";
import { analyzeBrokerConnections } from "./brokerEdgeAnalyzer";
import { ConvertedWorkflowData } from "../types";

type CompleteWorkflowData = ConvertedWorkflowData;

export interface EdgeAnalysisResult {
  validEdges: Edge[];
  invalidEdges: Edge[];
  expectedEdges: Edge[];
  databaseEdges: Edge[];
}

export interface EdgeValidationItem {
  edge: Edge;
  isValid: boolean;
  type: 'database' | 'virtual';
  reason?: string;
}

/**
 * Analyzes workflow edges by comparing database edges with expected broker-generated edges
 */
export function analyzeWorkflowEdges(
  databaseEdges: Edge[],
  completeWorkflowData: CompleteWorkflowData
): EdgeAnalysisResult {
  // Get expected edges from broker analysis
  const expectedEdges = analyzeBrokerConnections(completeWorkflowData);
  
  // Separate database edges from virtual edges
  const realDatabaseEdges = databaseEdges.filter(edge => !edge.id?.startsWith('virtual_'));
  const virtualEdges = databaseEdges.filter(edge => edge.id?.startsWith('virtual_'));

  // Create lookup maps for easy comparison
  const expectedEdgeMap = new Map<string, Edge>();
  expectedEdges.forEach(edge => {
    const key = `${edge.source}-${edge.target}-${edge.data?.connectionType || 'default'}`;
    expectedEdgeMap.set(key, edge);
  });

  const validEdges: Edge[] = [];
  const invalidEdges: Edge[] = [];

  // Check database edges against expected edges
  realDatabaseEdges.forEach(dbEdge => {
    const key = `${dbEdge.source}-${dbEdge.target}-${dbEdge.data?.connectionType || 'default'}`;
    const expectedEdge = expectedEdgeMap.get(key);
    
    if (expectedEdge) {
      validEdges.push(dbEdge);
    } else {
      // Check if there's any expected edge between the same nodes (different connection type)
      const hasAnyConnection = expectedEdges.some(
        expectedEdge => expectedEdge.source === dbEdge.source && expectedEdge.target === dbEdge.target
      );
      
      if (!hasAnyConnection) {
        invalidEdges.push(dbEdge);
      } else {
        // Edge exists but with different connection type - still mark as valid
        validEdges.push(dbEdge);
      }
    }
  });

  return {
    validEdges,
    invalidEdges,
    expectedEdges,
    databaseEdges: realDatabaseEdges
  };
}

/**
 * Creates a list of edge validation items for display
 */
export function createEdgeValidationList(
  databaseEdges: Edge[],
  completeWorkflowData: CompleteWorkflowData
): EdgeValidationItem[] {
  const analysis = analyzeWorkflowEdges(databaseEdges, completeWorkflowData);
  const items: EdgeValidationItem[] = [];

  // Add valid edges
  analysis.validEdges.forEach(edge => {
    items.push({
      edge,
      isValid: true,
      type: 'database'
    });
  });

  // Add invalid edges
  analysis.invalidEdges.forEach(edge => {
    items.push({
      edge,
      isValid: false,
      type: 'database',
      reason: 'No longer connected via broker relationships'
    });
  });

  return items.sort((a, b) => {
    // Sort by validity first (invalid first), then by source, then by target
    if (a.isValid !== b.isValid) {
      return a.isValid ? 1 : -1;
    }
    if (a.edge.source !== b.edge.source) {
      return a.edge.source.localeCompare(b.edge.source);
    }
    return a.edge.target.localeCompare(b.edge.target);
  });
} 