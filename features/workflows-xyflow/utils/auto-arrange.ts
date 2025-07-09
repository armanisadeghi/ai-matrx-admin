import { Node, Edge } from "@xyflow/react";

// Types for our auto-arrange system
export interface ArrangeConfig {
    sourceNodeSpacing: number;
    levelWidth: number;
    nodeSpacing: number;
    levelStartX: number;
    sourceNodeX: number;
    // Add padding between nodes
    verticalPadding: number;
    defaultNodeHeight: number;
    defaultCompactNodeHeight: number;
}

export interface DependencyGraph {
    dependencies: Map<string, Set<string>>;
    levels: Map<string, number>;
    nodesByLevel: Map<number, Node[]>;
}

export interface NodeCategories {
    sourceNodes: Node[];
    regularNodes: Node[];
}

// Default configuration
const DEFAULT_CONFIG: ArrangeConfig = {
    sourceNodeSpacing: 120,
    levelWidth: 350,
    nodeSpacing: 120,
    levelStartX: 100,
    sourceNodeX: -300,
    verticalPadding: 20,
    defaultNodeHeight: 160, // Default height for detailed nodes
    defaultCompactNodeHeight: 64, // Default height for compact nodes
};

/**
 * Get the measured height of a node or fallback to default
 */
function getNodeHeight(node: Node, config: ArrangeConfig): number {
    // Check if the node has a measured height
    const measuredHeight = node.data?.measuredHeight;
    if (typeof measuredHeight === 'number' && measuredHeight > 0) {
        return measuredHeight;
    }
    
    // Fallback based on display mode
    const displayMode = node.data?.displayMode || "detailed";
    return displayMode === "compact" ? config.defaultCompactNodeHeight : config.defaultNodeHeight;
}

/**
 * Main auto-arrange function that orchestrates the entire process
 */
export function autoArrangeNodes(
    nodes: Node[],
    edges: Edge[],
    config: Partial<ArrangeConfig> = {}
): Node[] {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Step 1: Categorize nodes
    const categories = categorizeNodes(nodes);
    
    // Step 2: Build dependency graph for regular nodes
    const dependencyGraph = buildDependencyGraph(categories.regularNodes, edges);
    
    // Step 3: Position source nodes
    const arrangedSourceNodes = positionSourceNodes(categories.sourceNodes, finalConfig);
    
    // Step 4: Position regular nodes based on dependencies
    const arrangedRegularNodes = positionRegularNodes(dependencyGraph, finalConfig);
    
    // Step 5: Combine and return
    return [...arrangedSourceNodes, ...arrangedRegularNodes];
}

/**
 * Categorizes nodes into source nodes and regular workflow nodes
 */
export function categorizeNodes(nodes: Node[]): NodeCategories {
    const sourceNodes = nodes.filter(node => 
        node.type === 'userInput' || node.type === 'userDataSource'
    );
    
    const regularNodes = nodes.filter(node => 
        node.type !== 'userInput' && node.type !== 'userDataSource'
    );
    
    return { sourceNodes, regularNodes };
}

/**
 * Builds a dependency graph from regular nodes and edges
 */
export function buildDependencyGraph(regularNodes: Node[], edges: Edge[]): DependencyGraph {
    const nodeMap = new Map(regularNodes.map(node => [node.id, node]));
    const dependencies = new Map<string, Set<string>>();
    
    // Initialize dependency sets for all regular nodes
    regularNodes.forEach(node => {
        dependencies.set(node.id, new Set());
    });
    
    // Build dependency relationships from edges
    edges.forEach(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        
        // Only consider edges between regular nodes (not from source nodes)
        if (sourceNode && targetNode) {
            dependencies.get(edge.target)?.add(edge.source);
        }
    });
    
    // Calculate levels for each node
    const levels = calculateNodeLevels(regularNodes, dependencies);
    
    // Group nodes by level
    const nodesByLevel = groupNodesByLevel(regularNodes, levels);
    
    return { dependencies, levels, nodesByLevel };
}

/**
 * Calculates the level (depth) of each node based on its dependencies
 */
export function calculateNodeLevels(
    nodes: Node[],
    dependencies: Map<string, Set<string>>
): Map<string, number> {
    const levels = new Map<string, number>();
    const processed = new Set<string>();
    
    // Recursive function to calculate level for a node
    const calculateLevel = (nodeId: string): number => {
        if (levels.has(nodeId)) {
            return levels.get(nodeId)!;
        }
        
        // Avoid infinite loops in case of cycles
        if (processed.has(nodeId)) {
            levels.set(nodeId, 0);
            return 0;
        }
        
        processed.add(nodeId);
        
        const nodeDependencies = dependencies.get(nodeId) || new Set();
        
        if (nodeDependencies.size === 0) {
            // No dependencies, this is a level 0 node
            levels.set(nodeId, 0);
            return 0;
        }
        
        // Calculate level as max dependency level + 1
        let maxDepLevel = -1;
        nodeDependencies.forEach(depId => {
            const depLevel = calculateLevel(depId);
            maxDepLevel = Math.max(maxDepLevel, depLevel);
        });
        
        const nodeLevel = maxDepLevel + 1;
        levels.set(nodeId, nodeLevel);
        return nodeLevel;
    };
    
    // Calculate levels for all nodes
    nodes.forEach(node => {
        calculateLevel(node.id);
    });
    
    return levels;
}

/**
 * Groups nodes by their calculated level
 */
export function groupNodesByLevel(
    nodes: Node[],
    levels: Map<string, number>
): Map<number, Node[]> {
    const nodesByLevel = new Map<number, Node[]>();
    
    nodes.forEach(node => {
        const level = levels.get(node.id) ?? 0;
        if (!nodesByLevel.has(level)) {
            nodesByLevel.set(level, []);
        }
        nodesByLevel.get(level)!.push(node);
    });
    
    return nodesByLevel;
}

/**
 * Positions source nodes on the left side using actual heights
 */
export function positionSourceNodes(
    sourceNodes: Node[],
    config: ArrangeConfig
): Node[] {
    let currentY = 0;
    
    return sourceNodes.map((node, index) => {
        const nodeHeight = getNodeHeight(node, config);
        const y = currentY;
        
        // Update currentY for the next node
        currentY += nodeHeight + config.verticalPadding;
        
        return {
            ...node,
            position: {
                x: config.sourceNodeX,
                y: y,
            },
            data: {
                ...node.data,
                displayMode: "compact", // Ensure they're compact
            },
        };
    });
}

/**
 * Positions regular nodes based on their dependency levels using actual heights
 */
export function positionRegularNodes(
    dependencyGraph: DependencyGraph,
    config: ArrangeConfig
): Node[] {
    const arrangedNodes: Node[] = [];
    
    // Sort levels and position nodes
    const sortedLevels = Array.from(dependencyGraph.nodesByLevel.entries())
        .sort(([a], [b]) => a - b);
    
    sortedLevels.forEach(([level, nodes]) => {
        const x = config.levelStartX + (level * config.levelWidth);
        
        // Calculate total height needed for this level
        const totalContentHeight = nodes.reduce((sum, node) => {
            return sum + getNodeHeight(node, config);
        }, 0);
        
        // Add padding between nodes (but not after the last one)
        const totalPaddingHeight = Math.max(0, nodes.length - 1) * config.verticalPadding;
        const totalHeight = totalContentHeight + totalPaddingHeight;
        
        // Start from a center point and work up and down
        const startY = 100 - (totalHeight / 2);
        let currentY = startY;
        
        nodes.forEach((node, index) => {
            const nodeHeight = getNodeHeight(node, config);
            
            arrangedNodes.push({
                ...node,
                position: {
                    x,
                    y: currentY,
                },
            });
            
            // Move to next position
            currentY += nodeHeight + config.verticalPadding;
        });
    });
    
    return arrangedNodes;
}

/**
 * Advanced positioning algorithms that can be implemented in the future
 */
export namespace AdvancedLayouts {
    /**
     * Future: Force-directed layout algorithm
     */
    export function forceDirectedLayout(
        nodes: Node[],
        edges: Edge[],
        config: ArrangeConfig
    ): Node[] {
        // TODO: Implement force-directed positioning
        // This could provide more natural, physics-based layouts
        return nodes;
    }
    
    /**
     * Future: Hierarchical layout with better edge routing
     */
    export function hierarchicalLayout(
        nodes: Node[],
        edges: Edge[],
        config: ArrangeConfig
    ): Node[] {
        // TODO: Implement Sugiyama-style hierarchical layout
        // This could provide better edge crossing minimization
        return nodes;
    }
    
    /**
     * Future: Circular layout for specific workflow patterns
     */
    export function circularLayout(
        nodes: Node[],
        edges: Edge[],
        config: ArrangeConfig
    ): Node[] {
        // TODO: Implement circular positioning
        // Useful for workflows with feedback loops
        return nodes;
    }
}

/**
 * Utility functions for analysis and debugging
 */
export namespace AnalysisUtils {
    /**
     * Detects cycles in the dependency graph
     */
    export function detectCycles(dependencies: Map<string, Set<string>>): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        
        const dfs = (nodeId: string, path: string[]): void => {
            if (recursionStack.has(nodeId)) {
                // Found a cycle
                const cycleStart = path.indexOf(nodeId);
                cycles.push(path.slice(cycleStart));
                return;
            }
            
            if (visited.has(nodeId)) {
                return;
            }
            
            visited.add(nodeId);
            recursionStack.add(nodeId);
            
            const deps = dependencies.get(nodeId) || new Set();
            deps.forEach(depId => {
                dfs(depId, [...path, nodeId]);
            });
            
            recursionStack.delete(nodeId);
        };
        
        dependencies.forEach((_, nodeId) => {
            if (!visited.has(nodeId)) {
                dfs(nodeId, []);
            }
        });
        
        return cycles;
    }
    
    /**
     * Calculates layout metrics for optimization
     */
    export function calculateLayoutMetrics(nodes: Node[], edges: Edge[]) {
        // TODO: Implement metrics like:
        // - Average edge length
        // - Edge crossings count
        // - Node distribution variance
        // - Layout compactness
        return {
            edgeCrossings: 0,
            averageEdgeLength: 0,
            layoutCompactness: 0,
        };
    }
    
    /**
     * Debug function to log node heights
     */
    export function logNodeHeights(nodes: Node[], config: ArrangeConfig) {
        console.log("Node Heights:");
        nodes.forEach(node => {
            const height = getNodeHeight(node, config);
            const measuredHeight = node.data?.measuredHeight;
            const displayMode = node.data?.displayMode || "detailed";
            console.log(`${node.id}: ${height}px (measured: ${measuredHeight || 'none'}, mode: ${displayMode})`);
        });
    }
}
