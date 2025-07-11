import { cloneDeep } from "lodash";
import { ArgumentOverride } from "@/features/workflows/types";
import { flexibleJsonParse } from "@/utils/json-utils";
import { registeredFunctions } from "@/features/workflows/constants";
import { getStore } from "@/lib/redux/store";

export const DEFAULT_EXCLUDE_ARG_NAMES = ["recipe_brokers", "session_manager", "user_id", "stream_handler", "internal_config_object"];
export const DEFAULT_HIDE_CONNECTIONS = ["recipe_id", "latest_version"];

export const ALL_HIDDEN_CONNECTIONS = [...DEFAULT_HIDE_CONNECTIONS, ...DEFAULT_EXCLUDE_ARG_NAMES];

// Get registered functions from Redux store (primary source)
export function getRegisteredFunctionsFromStore() {
    const store = getStore();
    if (!store) {
        return [];
    }

    const state = store.getState();
    const functions = Object.values(state.entities?.registeredFunction?.records || {});
    const args = Object.values(state.entities?.arg?.records || {});
    
    return functions.map((func: any) => ({
        id: func.id,
        name: func.name,
        return_broker: func.returnBroker,
        description: func.description,
        category: func.category,
        node_description: func.nodeDescription,
        tags: func.tags,
        icon: func.icon,
        args: args
            .filter((arg: any) => arg.registeredFunction === func.id)
            .filter((arg: any) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name))
            .map((arg: any) => ({
                name: arg.name,
                required: arg.required,
                data_type: arg.dataType,
                ready: arg.ready,
                default_value: arg.defaultValue?.value,
                description: arg.description,
                examples: arg.examples
            }))
    }));
}

export function getRegisteredFunctions() {
    // Try to get from Redux store first
    const storeData = getRegisteredFunctionsFromStore();
    if (storeData.length > 0) {
        return storeData;
    }
    
    // Fallback to constants if store is empty or not available
    return cloneDeep(registeredFunctions).map((func) => ({
        ...func,
        args: func.args.filter((arg) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name)),
    }));
}

// Helper function to get the effective value for an argument
export const getEffectiveArgValue = (arg: any, argOverrides?: ArgumentOverride[]): { value: any; ready: boolean } => {
    const override = argOverrides?.find((o) => o.name === arg.name);
    return {
        value: override?.default_value ?? arg.default_value ?? "",
        ready: override?.ready ?? arg.ready ?? false,
    };
};

// Function to update argument override
export const updateArgOverride = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    argName: string,
    field: keyof ArgumentOverride,
    value: any
): any => {
    const functionData = getRegisteredFunctions().find((f) => f.id === node.function_id);
    const updated = cloneDeep(node);
    if (!updated.arg_overrides) updated.arg_overrides = [];
    const existingIndex = updated.arg_overrides.findIndex((override) => override.name === argName);
    if (existingIndex >= 0) {
        updated.arg_overrides[existingIndex] = {
            ...updated.arg_overrides[existingIndex],
            [field]: value,
        };
    } else {
        const functionArg = functionData?.args.find((arg) => arg.name === argName);
        updated.arg_overrides.push({
            name: argName,
            default_value: functionArg?.default_value,
            required: functionArg?.required || false,
            ready: functionArg?.ready || false,
            [field]: value,
        });
    }
    
    // Call the callback if provided (for backward compatibility)
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    
    // Always return the updated node
    return updated;
};


// Interface for argument update operations
export interface ArgUpdate {
    argName: string;
    value: any;
    ready: boolean;
}

/**
 * Function to update multiple argument overrides in a single operation
 * This prevents race conditions when updating multiple arguments simultaneously
 * 
 * @param node - The node to update
 * @param onNodeUpdate - Callback to update the node
 * @param updates - Array of argument updates to apply
 * 
 * @example
 * // Update multiple arguments at once to avoid race conditions
 * updateMultipleArgOverrides(node, onNodeUpdate, [
 *     { argName: "recipe_id", value: "123", ready: true },
 *     { argName: "version", value: 1, ready: true },
 *     { argName: "latest_version", value: false, ready: true }
 * ]);
 */
export const updateMultipleArgOverrides = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    updates: ArgUpdate[]
) => {
    const functionData = getRegisteredFunctions().find((f) => f.id === node.function_id);
    const updated = cloneDeep(node);
    if (!updated.arg_overrides) updated.arg_overrides = [];

    // Apply all updates to the same node object
    updates.forEach(update => {
        const existingIndex = updated.arg_overrides.findIndex(override => override.name === update.argName);
        
        if (existingIndex >= 0) {
            // Update existing override
            updated.arg_overrides[existingIndex] = {
                ...updated.arg_overrides[existingIndex],
                default_value: update.value,
                ready: update.ready,
            };
        } else {
            // Create new override
            const functionArg = functionData?.args.find(arg => arg.name === update.argName);
            updated.arg_overrides.push({
                name: update.argName,
                default_value: update.value,
                required: functionArg?.required || false,
                ready: update.ready,
            });
        }
    });

    // Call onNodeUpdate once with all changes applied
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

/**
 * Convenience function to set argument value and ready state for a single argument
 * 
 * @param node - The node to update
 * @param onNodeUpdate - Callback to update the node
 * @param argName - Name of the argument to update
 * @param value - Value to set
 * @param ready - Ready state to set
 * 
 * @example
 * // Set a single argument value and ready state
 * setArgValueAndReady(node, onNodeUpdate, "recipe_id", "123", true);
 */
export const setArgValueAndReady = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    argName: string,
    value: any,
    ready: boolean
) => {
    return updateMultipleArgOverrides(node, onNodeUpdate, [
        { argName, value, ready }
    ]);
};

// Function to handle argument value changes with type conversion
export const handleArgValueChange = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    arg: any,
    inputValue: string
) => {
    let value: any = inputValue;

    // Convert value based on data type
    if (arg.data_type === "int") {
        value = inputValue ? parseInt(inputValue) || 0 : null;
    } else if (arg.data_type === "bool") {
        value = inputValue.toLowerCase() === "true";
    } else if (arg.data_type === "float") {
        value = inputValue ? parseFloat(inputValue) || 0 : null;
    } else if (arg.data_type === "dict" || arg.data_type === "list") {
        // For dict and list types, parse JSON to store as actual data structure
        if (inputValue && inputValue.trim() !== '') {
            try {
                // Use flexibleJsonParse to handle various JSON formats
                const parseResult = flexibleJsonParse(inputValue);
                if (parseResult.success) {
                    value = parseResult.data;
                } else {
                    // If parsing fails, keep as string but log warning
                    console.warn(`Failed to parse JSON for ${arg.name}:`, parseResult.error);
                    value = inputValue;
                }
            } catch (error) {
                console.warn(`Error parsing JSON for ${arg.name}:`, error);
                value = inputValue;
            }
        } else {
            // Empty value - set to appropriate empty structure
            value = arg.data_type === "dict" ? {} : [];
        }
    }

    return updateArgOverride(node, onNodeUpdate, arg.name, "default_value", value);
};

// Function to add broker mapping
export const addBrokerMapping = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    argName: string
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) updated.arg_mapping = [];
    updated.arg_mapping.push({
        source_broker_id: "",
        target_arg_name: argName,
    });
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to add arg mapping with broker id
export const addArgMappingWithBrokerId = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    argName: string,
    brokerId: string
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) updated.arg_mapping = [];
    updated.arg_mapping.push({
        source_broker_id: brokerId,
        target_arg_name: argName,
    });
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to update broker mapping
export const updateBrokerMapping = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    index: number,
    value: string
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) return;
    updated.arg_mapping[index] = {
        ...updated.arg_mapping[index],
        source_broker_id: value,
    };
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to remove broker mapping
export const removeBrokerMapping = (
    node: any,
    onNodeUpdate: ((updatedNode: any) => void) | null,
    index: number
) => {
    const updated = cloneDeep(node);
    if (!updated.arg_mapping) return;
    updated.arg_mapping.splice(index, 1);
    if (onNodeUpdate) {
        onNodeUpdate(updated);
    }
    return updated;
};

// Function to get function data
export const getFunctionData = (functionId: string) => {
    return getRegisteredFunctions().find((f) => f.id === functionId);
};

// Function to separate required and optional arguments
export const separateArguments = (functionData: any) => {
    if (!functionData || !functionData.args) {
        return { requiredArgs: [], optionalArgs: [] };
    }
    
    const requiredArgs = functionData.args.filter((arg: any) => arg.required);
    const optionalArgs = functionData.args.filter((arg: any) => !arg.required);
    
    return { requiredArgs, optionalArgs };
};

// Function to get broker mappings for a specific argument
export const getBrokerMappingsForArg = (node: any, argName: string) => {
    return node.arg_mapping?.filter((m: any) => m.target_arg_name === argName) || [];
};

// Function to check if function has arguments
export const hasFunctionArguments = (functionData: any) => {
    return functionData && functionData.args && functionData.args.length > 0;
};

