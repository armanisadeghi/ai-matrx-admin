import { BaseNode, KnownBroker, NodeKnownBrokers, WorkflowNodeMetadata, KnownBrokerComputer } from "../types";
import { RECIPE_NODE_DEFINITION } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/custom-workflow-nodes/custom-nodes/recipes/RecipeNodeEditor";

// ===== GLOBAL BROKERS =====

/**
 * Global brokers that are always available in any workflow
 */
const GLOBAL_BROKERS: KnownBroker[] = [
    {
        id: "system_user_id",
        label: "User ID",
        description: "Current user's unique identifier",
        dataType: "string",
        guaranteed: true,
    },
    {
        id: "system_timestamp",
        label: "Current Timestamp",
        description: "Current execution timestamp",
        dataType: "datetime",
        guaranteed: true,
    },
    {
        id: "system_workflow_id",
        label: "Workflow ID",
        description: "Current workflow's unique identifier",
        dataType: "string",
        guaranteed: true,
    },
    // Add more global brokers as needed
];

// ===== UTILITY FUNCTIONS =====

/**
 * Generate dynamic brokers from a node definition
 */
function generateBrokersFromDefinition(definition: any, dynamicValue: string): KnownBroker[] {
    if (!definition.predefined_brokers || !Array.isArray(definition.predefined_brokers)) {
        return [];
    }

    return definition.predefined_brokers.map((brokerDef: any) => {
        let brokerId = brokerDef.id;
        
        // Replace dynamic placeholders if this broker has dynamic_id
        if (brokerDef.dynamic_id && definition.dynamic_broker_arg) {
            const placeholder = `{${definition.dynamic_broker_arg}}`;
            brokerId = brokerId.replace(placeholder, dynamicValue);
        }

        return {
            id: brokerId,
            label: brokerDef.label,
            description: brokerDef.description,
            dataType: brokerDef.dataType,
            guaranteed: brokerDef.guaranteed,
        } as KnownBroker;
    });
}

/**
 * Check if a node matches a definition's criteria
 */
function nodeMatchesDefinition(node: BaseNode, definition: any): boolean {
    if (!definition.managed_arguments || !Array.isArray(definition.managed_arguments)) {
        return false;
    }

    // Check if node has the managed arguments that identify this type
    return definition.managed_arguments.some((argName: string) => 
        node.arg_overrides?.some((arg) => arg.name === argName)
    );
}

// ===== NODE-SPECIFIC BROKER COMPUTERS =====

/**
 * Computer for recipe nodes that generate predictable broker patterns
 * Now uses RECIPE_NODE_DEFINITION instead of hardcoded values
 */
const recipeNodeComputer: KnownBrokerComputer = {
    nodeType: "registered_function",
    functionType: "recipe_runner", // You might need to adjust this based on your function identification
    computeKnownBrokers: (node: BaseNode): NodeKnownBrokers | null => {
        // Check if this node matches the recipe definition
        if (!nodeMatchesDefinition(node, RECIPE_NODE_DEFINITION)) {
            return null;
        }

        // Get the dynamic value from the specified argument
        const dynamicArg = node.arg_overrides?.find((arg) => arg.name === RECIPE_NODE_DEFINITION.dynamic_broker_arg);
        const dynamicValue = dynamicArg?.default_value as string;
        
        if (!dynamicValue || typeof dynamicValue !== "string") {
            return null; // Can't compute brokers without the dynamic value
        }

        // Generate brokers from the definition
        const runtimeBrokers = generateBrokersFromDefinition(RECIPE_NODE_DEFINITION, dynamicValue);

        return {
            version: "1.0",
            computedAt: new Date().toISOString(),
            runtimeBrokers,
            globalBrokers: GLOBAL_BROKERS, // Include global brokers for completeness
            computationContext: {
                dynamicValue,
                nodeType: RECIPE_NODE_DEFINITION.node_type,
                functionId: node.function_id,
                definitionUsed: "RECIPE_NODE_DEFINITION",
            },
        };
    },
};

// ===== REGISTRY OF ALL COMPUTERS =====

/**
 * Registry of all known broker computers
 * Add new computers here as you create them for different node types
 */
const KNOWN_BROKER_COMPUTERS: KnownBrokerComputer[] = [
    recipeNodeComputer,
    // Add more computers for other node types here
];

// ===== PUBLIC API =====

/**
 * Compute known brokers for a given node
 * Returns null if no computer can handle this node type
 */
export function computeKnownBrokers(node: BaseNode): NodeKnownBrokers | null {
    // Find a computer that can handle this node
    const computer = KNOWN_BROKER_COMPUTERS.find((comp) => {
        // Match by node type first
        if (comp.nodeType !== node.function_type) {
            return false;
        }
        
        // If computer specifies a function type, match that too
        // You might need to adjust this logic based on how you identify specific function types
        if (comp.functionType) {
            // This might need to be adjusted based on your function identification strategy
            // For now, we'll assume recipe nodes have a specific function_id or can be identified another way
            return isRecipeNode(node); // Helper function to identify recipe nodes
        }
        
        return true;
    });

    if (!computer) {
        return null;
    }

    return computer.computeKnownBrokers(node);
}

/**
 * Helper function to identify if a node is a recipe node
 * Now uses RECIPE_NODE_DEFINITION instead of hardcoded values
 */
function isRecipeNode(node: BaseNode): boolean {
    return nodeMatchesDefinition(node, RECIPE_NODE_DEFINITION);
}

/**
 * Update a node's metadata with computed known brokers
 */
export function updateNodeWithKnownBrokers(node: BaseNode): BaseNode {
    const knownBrokers = computeKnownBrokers(node);
    
    if (!knownBrokers) {
        return node; // No known brokers to add
    }

    // Ensure metadata exists
    const currentMetadata = (node.metadata as WorkflowNodeMetadata) || {};
    
    const updatedMetadata: WorkflowNodeMetadata = {
        ...currentMetadata,
        knownBrokers,
    };

    return {
        ...node,
        metadata: updatedMetadata,
    };
}

/**
 * Get all known brokers for a node (from metadata + computed)
 */
export function getAllKnownBrokers(node: BaseNode): KnownBroker[] {
    const allBrokers: KnownBroker[] = [];
    
    // Add global brokers
    allBrokers.push(...GLOBAL_BROKERS);
    
    // Try to get from metadata first
    const metadata = node.metadata as WorkflowNodeMetadata;
    if (metadata?.knownBrokers?.runtimeBrokers) {
        allBrokers.push(...metadata.knownBrokers.runtimeBrokers);
    } else {
        // Fallback to computing them
        const computed = computeKnownBrokers(node);
        if (computed?.runtimeBrokers) {
            allBrokers.push(...computed.runtimeBrokers);
        }
    }
    
    // Also include explicitly declared return brokers as known brokers
    if (node.return_broker_overrides) {
        node.return_broker_overrides.forEach((brokerId, index) => {
            allBrokers.push({
                id: brokerId,
                label: `Return Broker ${index + 1}`,
                description: "Explicitly declared return broker",
                dataType: "unknown",
                guaranteed: true,
            });
        });
    }
    
    return allBrokers;
}

/**
 * Get known brokers metadata from a node
 */
export function getKnownBrokersMetadata(node: BaseNode): NodeKnownBrokers | null {
    const metadata = node.metadata as WorkflowNodeMetadata;
    return metadata?.knownBrokers || null;
}

/**
 * Check if a broker ID is known for a given node
 */
export function isBrokerKnown(brokerId: string, node: BaseNode): boolean {
    const knownBrokers = getAllKnownBrokers(node);
    return knownBrokers.some((broker) => broker.id === brokerId);
}

/**
 * Get all global brokers
 */
export function getGlobalBrokers(): KnownBroker[] {
    return [...GLOBAL_BROKERS];
}

/**
 * Register a new known broker computer
 */
export function registerKnownBrokerComputer(computer: KnownBrokerComputer): void {
    KNOWN_BROKER_COMPUTERS.push(computer);
} 