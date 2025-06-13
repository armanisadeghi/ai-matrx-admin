import { DbFunctionNode, ArgumentOverride, ArgumentMapping } from "@/features/workflows/types";
import { v4 as uuidv4 } from "uuid";
import { cloneDeep } from "lodash";
import {
    DEFAULT_EXCLUDE_ARG_NAMES,
    ALL_HIDDEN_CONNECTIONS,
    getRegisteredFunctions,
} from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";



export function getNormalizedRegisteredFunctionNode(function_id: string, workflowId?: string): DbFunctionNode {
    const function_data = getRegisteredFunctions().find((f) => f.id === function_id);
    if (!function_data) {
        throw new Error(`Function with id ${function_id} not found`);
    }

    const arg_overrides: ArgumentOverride[] = function_data.args
        .filter((arg) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name))
        .map((arg) => ({
            name: arg.name,
            default_value: cloneDeep(arg.default_value),
            ready: arg.ready,
            required: arg.required,
        }));

    const node: DbFunctionNode = {
        id: uuidv4(),
        function_id: function_data.id,
        function_type: "registered_function",
        step_name: `New ${function_data.name} Step`,
        execution_required: true,
        additional_dependencies: [],
        arg_mapping: [],
        return_broker_overrides: [function_data.return_broker],
        arg_overrides: arg_overrides,
        workflow_id: workflowId || null,
        status: "pending",
        node_type: "functionNode",
        user_id: null,
        metadata: {},
    };
    return node;
}

export function validateNodeUpdate(node: DbFunctionNode): boolean {
    // Ensure function_id exists and is valid
    if (!node.function_id) {
        throw new Error("Node must have a valid function_id");
    }

    const functionData = getRegisteredFunctions().find((f) => f.id === node.function_id);
    if (!functionData) {
        throw new Error(`Function with id ${node.function_id} not found`);
    }

    // Get valid argument names from the registered function
    const validArgNames = new Set(functionData.args.map((arg) => arg.name));

    // Validate arg_overrides
    if (node.arg_overrides) {
        for (const override of node.arg_overrides) {
            if (!validArgNames.has(override.name)) {
                throw new Error(
                    `Invalid argument override name: ${override.name}. Must be one of: ${Array.from(validArgNames).join(", ")}`
                );
            }
            if (DEFAULT_EXCLUDE_ARG_NAMES.includes(override.name)) {
                throw new Error(`Argument override name '${override.name}' is in the excluded list and cannot be used`);
            }
        }
    }

    // Validate arg_mapping
    if (node.arg_mapping) {
        for (const mapping of node.arg_mapping) {
            if (!validArgNames.has(mapping.target_arg_name)) {
                throw new Error(
                    `Invalid argument mapping name: ${mapping.target_arg_name}. Must be one of: ${Array.from(validArgNames).join(", ")}`
                );
            }
            if (DEFAULT_EXCLUDE_ARG_NAMES.includes(mapping.target_arg_name)) {
                throw new Error(`Argument mapping name '${mapping.target_arg_name}' is in the excluded list and cannot be used`);
            }
        }
    }

    // Validate basic node structure
    if (node.function_type !== "registered_function") {
        throw new Error('Node function_type must be "registered_function"');
    }

    if (!node.id) {
        throw new Error("Node must have a valid id");
    }

    return true;
}

// Adds a broker mapping to a node for a specific argument
export function addBrokerMapping(node: DbFunctionNode, brokerId: string, argName: string): DbFunctionNode {
    if (!node.function_id) {
        throw new Error("Node must have a valid function_id");
    }

    const functionData = getRegisteredFunctions().find((f) => f.id === node.function_id);
    if (!functionData) {
        throw new Error(`Function with id ${node.function_id} not found`);
    }

    // Validate the argument name
    const validArgNames = new Set(functionData.args.map((arg) => arg.name));
    if (!validArgNames.has(argName)) {
        throw new Error(`Invalid argument name: ${argName}. Must be one of: ${Array.from(validArgNames).join(", ")}`);
    }

    // Check if the argument is in the excluded list
    if (DEFAULT_EXCLUDE_ARG_NAMES.includes(argName)) {
        throw new Error(`Argument name '${argName}' is in the excluded list and cannot be used`);
    }

    // Create a deep copy of the node to avoid mutating the original
    const updatedNode = cloneDeep(node);

    // Initialize arg_mapping if it doesn't exist
    if (!updatedNode.arg_mapping) {
        updatedNode.arg_mapping = [];
    }

    // Check if a mapping for this argName already exists
    const existingMappingIndex = updatedNode.arg_mapping.findIndex((mapping) => mapping.target_arg_name === argName);

    const newMapping: ArgumentMapping = {
        source_broker_id: brokerId,
        target_arg_name: argName,
    };

    if (existingMappingIndex !== -1) {
        // Update existing mapping
        updatedNode.arg_mapping[existingMappingIndex] = newMapping;
    } else {
        // Add new mapping
        updatedNode.arg_mapping.push(newMapping);
    }

    // Validate the updated node
    validateNodeUpdate(updatedNode);

    return updatedNode;
}

export interface SelectOption {
    value: string; // The function ID
    label: string; // The function name
}

// Returns registered functions formatted as select component options
export function getRegisteredFunctionSelectOptions(): SelectOption[] {
    return getRegisteredFunctions().map((func) => ({
        value: func.id,
        label: func.name,
    }));
}

export function isNodeConnected(node: DbFunctionNode): boolean {
    // If node or arg_overrides is missing, return false
    if (!node || !node.arg_overrides) {
        return false;
    }

    // Get all argument overrides
    const args = node.arg_overrides;
    // Get argument mappings, default to empty array if undefined
    const mappings = node.arg_mapping || [];

    // Check each argument
    for (const arg of args) {
        // Skip if arg is not explicitly required
        if (arg.required !== true) {
            continue;
        }

        // If arg is ready, it's satisfied
        if (arg.ready) {
            continue;
        }

        // If arg is not ready, check for a valid mapping
        const mapping = mappings.find((m) => m.target_arg_name === arg.name);

        // If no mapping exists or mapping has no valid source_broker_id, return false
        if (!mapping || !mapping.source_broker_id) {
            return false;
        }
    }

    // All arguments are either ready or have valid mappings
    return true;
}

export interface Input {
    id: string;
    label: string;
}

/**
 * Formats an input identifier into a human-readable label.
 * For argument names, converts from snake_case/SNAKE_CASE/kabob-case to Title Case.
 * For broker IDs with UUID_text pattern, extracts and formats the text part.
 * Shows UUID directly if it's a plain UUID with no additional text.
 */
function formatInputLabel(inputId: string, fallbackLabel?: string): string {
    // If we have a fallback label, use it
    if (fallbackLabel && fallbackLabel !== inputId) {
        return fallbackLabel;
    }
    
    // Check if it's a plain UUID (pattern: 8-4-4-4-12 hexadecimal digits)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(inputId)) {
        return inputId;
    }
    
    // Check if it's a UUID followed by underscore and text (UUID_text pattern)
    const uuidWithTextPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_(.+)$/i;
    const uuidMatch = inputId.match(uuidWithTextPattern);
    if (uuidMatch) {
        // Extract the part after the UUID and underscore
        const namePart = uuidMatch[1];
        const formatted = namePart
            .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        return formatted || inputId;
    }
    
    // For regular argument names, convert snake_case/SNAKE_CASE/kabob-case to Title Case
    const formatted = inputId
        .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return formatted || inputId;
}

export function getNodePotentialInputs(node: DbFunctionNode): Input[] {
    const inputs: Input[] = [];

    // Process dependencies
    node.additional_dependencies.forEach((dep) => {
        if (dep.source_broker_id) {
            inputs.push({
                id: dep.source_broker_id,
                label: formatInputLabel(dep.source_broker_id, dep.source_broker_name),
            });
        }
    });

    // Process argument mappings
    node.arg_mapping.forEach((mapping) => {
        if (mapping.source_broker_id && mapping.target_arg_name) {
            inputs.push({
                id: mapping.source_broker_id,
                label: formatInputLabel(mapping.target_arg_name),
            });
        }
    });

    node.arg_overrides.forEach((arg) => {
        const argName = arg.name;
        if (!inputs.some((input) => input.label === formatInputLabel(argName)) && !ALL_HIDDEN_CONNECTIONS.includes(argName)) {
            inputs.push({
                id: argName,
                label: formatInputLabel(argName),
            });
        }
    });

    return inputs;
}

export interface Output {
    id: string;
    label: string;
}

/**
 * Formats a broker ID into a human-readable label.
 * Extracts text after the first underscore and converts from snake_case/SNAKE_CASE/kabob-case to Title Case.
 * Shows UUID directly if it's a valid UUID with no additional text.
 * Falls back to "Result {index + 1}" if no underscore or invalid pattern.
 */
function formatBrokerLabel(brokerId: string, index: number): string {
    // Check if the broker ID contains an underscore
    const underscoreIndex = brokerId.indexOf('_');
    if (underscoreIndex === -1) {
        // Check if it's a UUID (pattern: 8-4-4-4-12 hexadecimal digits)
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(brokerId)) {
            return brokerId;
        }
        return `Result ${index + 1}`;
    }
    
    // Extract the part after the first underscore
    const namePart = brokerId.substring(underscoreIndex + 1);
    
    // If the name part is empty, fall back to default
    if (!namePart.trim()) {
        return `Result ${index + 1}`;
    }
    
    // Convert snake_case, SNAKE_CASE, and kabob-case to Title Case
    const formatted = namePart
        .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return formatted || `Result ${index + 1}`;
}

export function getNodePotentialOutputs(node: DbFunctionNode): Output[] {
    const outputs: Output[] = [];

    // Process workflow dependencies
    node.additional_dependencies.forEach((dep) => {
        if (dep.target_broker_id) {
            outputs.push({
                id: dep.target_broker_id,
                label: dep.target_broker_name || dep.target_broker_id,
            });
        }
    });

    // Process return broker overrides
    node.return_broker_overrides.forEach((brokerId, index) => {
        outputs.push({
            id: brokerId,
            label: formatBrokerLabel(brokerId, index),
        });
    });
    return outputs;
}

export function getNodePotentialInputsAndOutputs(node: DbFunctionNode): { inputs: Input[]; outputs: Output[] } {
    return {
        inputs: getNodePotentialInputs(node),
        outputs: getNodePotentialOutputs(node),
    };
}

export interface NodeWithInputsAndOutputs extends DbFunctionNode {
    inputs: Input[];
    outputs: Output[];
}

export function getNodeWithInputsAndOutputs(node: DbFunctionNode): NodeWithInputsAndOutputs {
    return {
        ...node,
        inputs: getNodePotentialInputs(node),
        outputs: getNodePotentialOutputs(node),
    };
}

