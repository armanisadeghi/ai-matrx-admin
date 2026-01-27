'use client';

import { FunctionNode, DbFunctionNode } from '@/features/workflows/types';
import { NodeDataMethods, ValidationMode } from '../custom-workflow-nodes/types';
import { validateNodeUpdate } from '@/features/workflows/utils/node-utils';
import { reactFlowToDatabase, databaseToReactFlow } from '@/features/workflows/service/functionNodeService';

// Import our centralized utilities
import {
    updateArgOverride,
    handleArgValueChange,
    addBrokerMapping,
    updateBrokerMapping,
    removeBrokerMapping,
    getFunctionData,
    getEffectiveArgValue,
    getBrokerMappingsForArg,
    getArgumentsWithData,
    getAllReturnBrokers,
} from '.';

// Import dependency utilities
import {
    addWorkflowDependency,
    updateWorkflowDependency,
    removeWorkflowDependency,
} from './dependency-utils';

// Import mapping utilities
import {
    addArgumentMapping,
    updateArgumentMapping,
    removeArgumentMapping,
} from './mapping-utils';

/**
 * Creates a comprehensive set of methods for manipulating node data
 * Now uses our centralized utilities to ensure consistency and eliminate duplication
 */
export function createNodeDataMethods(
    currentNode: FunctionNode,
    originalNode: FunctionNode,
    updateCallback: (updatedNode: FunctionNode) => void,
    validationMode: ValidationMode = 'permissive'
): NodeDataMethods {

    /**
     * Convert FunctionNode to DbFunctionNode for utilities that require it
     */
    const toDbNode = (node: FunctionNode): DbFunctionNode => {
        return reactFlowToDatabase(node);
    };

    /**
     * Convert DbFunctionNode back to FunctionNode for update callback
     */
    const toReactFlowNode = (dbNode: DbFunctionNode): FunctionNode => {
        return databaseToReactFlow(dbNode);
    };

    /**
     * Wrapper for validation that respects the validation mode
     */
    const validateUpdate = (updatedNode: FunctionNode): boolean => {
        try {
            const dbNode = toDbNode(updatedNode);
            validateNodeUpdate(dbNode);
            return true;
        } catch (error) {
            if (validationMode === 'strict') {
                throw error;
            } else {
                console.warn('Node validation warning:', error);
                return false;
            }
        }
    };

    /**
     * Enhanced update callback that includes validation
     */
    const enhancedUpdateCallback = (updatedNode: FunctionNode): void => {
        validateUpdate(updatedNode);
        updateCallback(updatedNode);
    };

    /**
     * Enhanced update callback for DbFunctionNode that converts back to FunctionNode
     */
    const enhancedUpdateCallbackFromDb = (updatedDbNode: DbFunctionNode): void => {
        const reactFlowNode = toReactFlowNode(updatedDbNode);
        validateUpdate(reactFlowNode);
        updateCallback(reactFlowNode);
    };

    return {
        // ===== BASIC NODE PROPERTIES =====
        updateStepName: (stepName: string) => {
            enhancedUpdateCallback({ ...currentNode, data: { ...currentNode.data, step_name: stepName } });
        },

        updateFunctionType: (functionType: string) => {
            enhancedUpdateCallback({ ...currentNode, data: { ...currentNode.data, function_type: functionType } });
        },

        updateExecutionRequired: (required: boolean) => {
            enhancedUpdateCallback({ ...currentNode, data: { ...currentNode.data, execution_required: required } });
        },

        updateStatus: (status: string) => {
            enhancedUpdateCallback({ ...currentNode, data: { ...currentNode.data, status } });
        },

        updateFunctionId: (functionId: string) => {
            enhancedUpdateCallback({ ...currentNode, data: { ...currentNode.data, function_id: functionId } });
        },

        updateWorkflowId: (workflowId: string) => {
            enhancedUpdateCallback({ ...currentNode, data: { ...currentNode.data, workflow_id: workflowId } });
        },

        // ===== ARGUMENT OVERRIDES MANAGEMENT =====
        // Use our centralized utilities instead of duplicating logic
        setArgumentValue: (argName: string, value: any) => {
            updateArgOverride(currentNode, enhancedUpdateCallback, argName, "default_value", value);
        },

        setArgumentReady: (argName: string, ready: boolean) => {
            updateArgOverride(currentNode, enhancedUpdateCallback, argName, "ready", ready);
        },

        setArgumentRequired: (argName: string, required: boolean) => {
            updateArgOverride(currentNode, enhancedUpdateCallback, argName, "required", required);
        },

        removeArgumentOverride: (argName: string) => {
            const updated = { 
                ...currentNode, 
                data: { ...currentNode.data, arg_overrides: (currentNode.data.arg_overrides || []).filter(o => o.name !== argName) }
            };
            enhancedUpdateCallback(updated);
        },

        getArgumentOverride: (argName: string) => {
            return currentNode.data.arg_overrides?.find(o => o.name === argName);
        },

        getAllArgumentOverrides: () => {
            return [...(currentNode.data.arg_overrides || [])];
        },

        // ===== ARGUMENT MAPPINGS MANAGEMENT =====
        // Use our centralized mapping utilities
        addArgumentMapping: (targetArgName: string, sourceBrokerId: string) => {
            // Create a temporary mapping and use our utility
            const tempNode = { ...currentNode };
            addArgumentMapping(tempNode, enhancedUpdateCallback);
            // Then update the specific mapping
            const mappings = [...(tempNode.data.arg_mapping || [])];
            const lastIndex = mappings.length - 1;
            if (lastIndex >= 0) {
                updateArgumentMapping(tempNode, enhancedUpdateCallback, lastIndex, 'target_arg_name', targetArgName);
                updateArgumentMapping(tempNode, enhancedUpdateCallback, lastIndex, 'source_broker_id', sourceBrokerId);
            }
        },

        updateArgumentMapping: (index: number, sourceBrokerId: string) => {
            updateArgumentMapping(currentNode, enhancedUpdateCallback, index, 'source_broker_id', sourceBrokerId);
        },

        removeArgumentMapping: (index: number) => {
            removeArgumentMapping(currentNode, enhancedUpdateCallback, index);
        },

        removeArgumentMappingsForArg: (argName: string) => {
            const updated = {
                ...currentNode,
                data: { ...currentNode.data, arg_mapping: (currentNode.data.arg_mapping || []).filter(m => m.target_arg_name !== argName) }
            };
            enhancedUpdateCallback(updated);
        },

        getArgumentMappings: (argName?: string) => {
            if (argName) {
                return getBrokerMappingsForArg(currentNode, argName);
            }
            return [...(currentNode.data.arg_mapping || [])];
        },

        // ===== DEPENDENCIES MANAGEMENT =====
        // Use our centralized dependency utilities
        addDependency: (sourceBrokerId: string, targetBrokerId?: string) => {
            const dbNode = toDbNode(currentNode);
            // Add the dependency and get the updated node
            const updatedDbNode = addWorkflowDependency(dbNode, enhancedUpdateCallbackFromDb);
            // Update the last added dependency with the actual values
            const dependencies = [...(updatedDbNode.additional_dependencies || [])];
            const lastIndex = dependencies.length - 1;
            if (lastIndex >= 0) {
                updateWorkflowDependency(updatedDbNode, enhancedUpdateCallbackFromDb, lastIndex, 'source_broker_id', sourceBrokerId);
                if (targetBrokerId) {
                    updateWorkflowDependency(updatedDbNode, enhancedUpdateCallbackFromDb, lastIndex, 'target_broker_id', targetBrokerId);
                }
            }
        },

        updateDependency: (index: number, field: 'source_broker_id' | 'target_broker_id', value: string) => {
            const dbNode = toDbNode(currentNode);
            updateWorkflowDependency(dbNode, enhancedUpdateCallbackFromDb, index, field, value);
        },

        removeDependency: (index: number) => {
            const dbNode = toDbNode(currentNode);
            removeWorkflowDependency(dbNode, enhancedUpdateCallbackFromDb, index);
        },

        getDependencies: () => {
            return [...(currentNode.data.additional_dependencies || [])];
        },

        // ===== RETURN BROKER OVERRIDES MANAGEMENT =====
        // Implement broker overrides directly until broker-utils is created
        addReturnBrokerOverride: (brokerId: string) => {
            const updated = {
                ...currentNode,
                data: { ...currentNode.data, return_broker_overrides: [...(currentNode.data.return_broker_overrides || []), brokerId] }
            };
            enhancedUpdateCallback(updated);
        },

        updateReturnBrokerOverride: (index: number, brokerId: string) => {
            const overrides = [...(currentNode.data.return_broker_overrides || [])];
            if (overrides[index] !== undefined) {
                overrides[index] = brokerId;
                const updated = { ...currentNode, data: { ...currentNode.data, return_broker_overrides: overrides } };
                enhancedUpdateCallback(updated);
            }
        },

        removeReturnBrokerOverride: (index: number) => {
            const updated = {
                ...currentNode,
                data: { ...currentNode.data, return_broker_overrides: (currentNode.data.return_broker_overrides || []).filter((_, i) => i !== index) }
            };
            enhancedUpdateCallback(updated);
        },

        getReturnBrokerOverrides: () => {
            return [...(currentNode.data.return_broker_overrides || [])];
        },

        // ===== UTILITY METHODS =====
        validateNode: () => {
            return validateUpdate(currentNode);
        },

        resetNode: () => {
            enhancedUpdateCallback(originalNode);
        },

        getNodeSnapshot: () => {
            return toDbNode(currentNode);
        },

        hasUnsavedChanges: () => {
            return JSON.stringify(currentNode) !== JSON.stringify(originalNode);
        },

        // ===== COMPUTED PROPERTIES HELPERS =====
        // Use our centralized utilities for consistency
        getEffectiveArgumentValue: (argName: string) => {
            const functionData = getFunctionData(currentNode.data.function_id);
            const arg = functionData?.args.find((a: any) => a.name === argName);
            if (!arg) return { value: null, ready: false };
            return getEffectiveArgValue(arg, currentNode.data.arg_overrides);
        },

        getArgumentsWithMappings: () => {
            const functionData = getFunctionData(currentNode.data.function_id);
            const dbNode = toDbNode(currentNode);
            const argumentsWithData = getArgumentsWithData(dbNode, functionData);
            return argumentsWithData.map(arg => ({
                arg,
                mappings: getBrokerMappingsForArg(currentNode, arg.name),
                override: currentNode.data.arg_overrides?.find(o => o.name === arg.name)
            }));
        },

        getAllReturnBrokers: () => {
            const functionData = getFunctionData(currentNode.data.function_id);
            const dbNode = toDbNode(currentNode);
            return getAllReturnBrokers(dbNode, functionData);
        },

        getNodeValidationErrors: () => {
            try {
                const dbNode = toDbNode(currentNode);
                validateNodeUpdate(dbNode);
                return [];
            } catch (error) {
                return [error instanceof Error ? error.message : 'Validation failed'];
            }
        }
    };
} 