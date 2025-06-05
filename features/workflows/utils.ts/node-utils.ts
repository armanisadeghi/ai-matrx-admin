import { BaseNode, ArgumentOverride, ArgumentMapping } from "@/features/workflows/types";
import { getRegisteredFunctions } from "@/features/workflows/constants";
import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash';

const DEFAULT_EXCLUDE_ARG_NAMES = ["recipe_brokers"];

export function getNormalizedRegisteredFunctionNode(function_id: string): BaseNode {
    const function_data = getRegisteredFunctions().find(f => f.id === function_id);
    if (!function_data) {
        throw new Error(`Function with id ${function_id} not found`);
    }

    const arg_overrides: ArgumentOverride[] = function_data.args
        .filter(arg => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name))
        .map(arg => ({
            name: arg.name,
            default_value: cloneDeep(arg.default_value),
            ready: arg.ready,
        }));

    const node: BaseNode = {
        id: uuidv4(),
        function_id: function_data.id,
        function_type: "registered_function",
        step_name: "Unnamed Step",
        execution_required: false,
        additional_dependencies: [],
        arg_mapping: [],
        return_broker_overrides: [function_data.return_broker],
        arg_overrides: arg_overrides,
        workflow_id: null,
    }

    return node;
}

export function validateNodeUpdate(node: BaseNode): boolean {
    // Ensure function_id exists and is valid
    if (!node.function_id) {
        throw new Error('Node must have a valid function_id');
    }

    const functionData = getRegisteredFunctions().find(f => f.id === node.function_id);
    if (!functionData) {
        throw new Error(`Function with id ${node.function_id} not found`);
    }

    // Get valid argument names from the registered function
    const validArgNames = new Set(functionData.args.map(arg => arg.name));

    // Validate arg_overrides
    if (node.arg_overrides) {
        for (const override of node.arg_overrides) {
            if (!validArgNames.has(override.name)) {
                throw new Error(`Invalid argument override name: ${override.name}. Must be one of: ${Array.from(validArgNames).join(', ')}`);
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
                throw new Error(`Invalid argument mapping name: ${mapping.target_arg_name}. Must be one of: ${Array.from(validArgNames).join(', ')}`);
            }
            if (DEFAULT_EXCLUDE_ARG_NAMES.includes(mapping.target_arg_name)) {
                throw new Error(`Argument mapping name '${mapping.target_arg_name}' is in the excluded list and cannot be used`);
            }
        }
    }

    // Validate basic node structure
    if (node.function_type !== 'registered_function') {
        throw new Error('Node function_type must be "registered_function"');
    }

    if (!node.id) {
        throw new Error('Node must have a valid id');
    }

    return true;
}

// Adds a broker mapping to a node for a specific argument
export function addBrokerMapping(node: BaseNode, brokerId: string, argName: string): BaseNode {
    if (!node.function_id) {
        throw new Error('Node must have a valid function_id');
    }

    const functionData = getRegisteredFunctions().find(f => f.id === node.function_id);
    if (!functionData) {
        throw new Error(`Function with id ${node.function_id} not found`);
    }

    // Validate the argument name
    const validArgNames = new Set(functionData.args.map(arg => arg.name));
    if (!validArgNames.has(argName)) {
        throw new Error(`Invalid argument name: ${argName}. Must be one of: ${Array.from(validArgNames).join(', ')}`);
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
    const existingMappingIndex = updatedNode.arg_mapping.findIndex(
        mapping => mapping.target_arg_name === argName
    );

    const newMapping: ArgumentMapping = {
        source_broker_id: brokerId,
        target_arg_name: argName
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
    return getRegisteredFunctions().map(func => ({
        value: func.id,
        label: func.name
    }));
}