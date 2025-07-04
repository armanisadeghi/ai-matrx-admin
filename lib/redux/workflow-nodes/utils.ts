// Utility functions for workflow nodes

import { WorkflowNodeMetadata, WorkflowNodeUiData } from "./types";
import { InputMapping, Output, Dependency } from "../workflow/types";
import { 
    createInputMapping, 
    createOutput, 
    createDependency,
    validateInputMapping,
    validateOutput,
    validateDependency,
    ensureInputMappingArray,
    ensureOutputArray,
    ensureDependencyArray
} from "../workflow/utils";

// WorkflowNode-specific factory functions
export const createWorkflowNodeMetadata = (data?: Partial<WorkflowNodeMetadata>): WorkflowNodeMetadata => ({
    ...data,
});

export const createWorkflowNodeUiData = (nodeWithoutData?: Partial<WorkflowNodeUiData>): Partial<WorkflowNodeUiData> => ({
    ...nodeWithoutData,
});

// Default values for new workflow node items
export const getDefaultWorkflowNodeInputMapping = (): InputMapping => createInputMapping({
    type: 'arg_mapping',
    arg_name: 'node_input',
    ready: false,
});

export const getDefaultWorkflowNodeOutput = (): Output => createOutput({
    name: 'node_output',
    is_default_output: false,
    data_type: 'string',
});

export const getDefaultWorkflowNodeDependency = (): Dependency => createDependency({
    type: 'node',
});

// Re-export shared utilities for convenience
export {
    createInputMapping,
    createOutput,
    createDependency,
    validateInputMapping,
    validateOutput,
    validateDependency,
    ensureInputMappingArray,
    ensureOutputArray,
    ensureDependencyArray,
};

// WorkflowNode-specific validation helpers
export const validateWorkflowNodeMetadata = (metadata: WorkflowNodeMetadata): boolean => {
    return typeof metadata === 'object' && metadata !== null;
};

export const validateWorkflowNodeUiData = (uiData: WorkflowNodeUiData): boolean => {
    return typeof uiData === 'object' && uiData !== null;
};

// WorkflowNode-specific array helpers
export const hasValidNodeInputs = (inputs: InputMapping[] | null): boolean => {
    return !!(inputs && inputs.length > 0 && inputs.some(validateInputMapping));
};

export const hasValidNodeOutputs = (outputs: Output[] | null): boolean => {
    return !!(outputs && outputs.length > 0 && outputs.some(validateOutput));
};

export const hasValidNodeDependencies = (dependencies: Dependency[] | null): boolean => {
    return !!(dependencies && dependencies.length > 0 && dependencies.some(validateDependency));
};

// WorkflowNode-specific utility functions
export const getNodeArrayCounts = (
    inputs: InputMapping[] | null,
    outputs: Output[] | null,
    dependencies: Dependency[] | null
) => {
    return {
        inputs: inputs?.length || 0,
        outputs: outputs?.length || 0,
        dependencies: dependencies?.length || 0,
    };
};

export const isNodeFullyConfigured = (
    inputs: InputMapping[] | null,
    outputs: Output[] | null,
    stepName: string | null,
    functionId: string | null
): boolean => {
    return !!(
        stepName && 
        functionId && 
        hasValidNodeInputs(inputs) && 
        hasValidNodeOutputs(outputs)
    );
};

// Array manipulation helpers specific to workflow nodes
export const findNodeInputIndex = (inputs: InputMapping[], predicate: (input: InputMapping) => boolean): number => {
    return inputs.findIndex(predicate);
};

export const findNodeOutputIndex = (outputs: Output[], predicate: (output: Output) => boolean): number => {
    return outputs.findIndex(predicate);
};

export const findNodeDependencyIndex = (dependencies: Dependency[], predicate: (dependency: Dependency) => boolean): number => {
    return dependencies.findIndex(predicate);
}; 