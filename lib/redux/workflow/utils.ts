// Utility functions for type conversion and validation

import { Dependency, InputMapping, Output, Bookmark, Result, Relay, BrokerSourceConfig, BrokerDestination, WorkflowMetadata } from "./types";

// Factory functions for creating complex types
export const createInputMapping = (data?: Partial<InputMapping>): InputMapping => ({
    type: data?.type ?? null,
    arg_name: data?.arg_name ?? null,
    source_broker_id: data?.source_broker_id ?? null,
    default_value: data?.default_value,
    ready: data?.ready ?? false,
    metadata: data?.metadata ?? {},
});

export const createBookmark = (data?: Partial<Bookmark>): Bookmark => ({
    name: data?.name ?? null,
    path: data?.path ?? [],
});

export const createResult = (data?: Partial<Result>): Result => ({
    component: data?.component ?? null,
    bookmark: data?.bookmark ? createBookmark(data.bookmark) : null,
    metadata: data?.metadata ?? {},
});

export const createRelay = (data?: Partial<Relay>): Relay => ({
    type: data?.type ?? null,
    id: data?.id ?? null,
});

export const createOutput = (data?: Partial<Output>): Output => ({
    broker_id: data?.broker_id ?? null,
    is_default_output: data?.is_default_output ?? false,
    name: data?.name ?? null,
    bookmark: data?.bookmark ? createBookmark(data.bookmark) : null,
    conversion: data?.conversion,
    data_type: data?.data_type ?? null,
    result: data?.result ? createResult(data.result) : null,
    relays: data?.relays?.map(createRelay) ?? [],
    metadata: data?.metadata ?? {},
});

export const createDependency = (data?: Partial<Dependency>): Dependency => ({
    type: data?.type ?? null,
    id: data?.id ?? null,
    metadata: data?.metadata ?? {},
});

export const createBrokerSourceConfig = (data?: Partial<BrokerSourceConfig>): BrokerSourceConfig => ({
    brokerId: data?.brokerId ?? '',
    scope: data?.scope ?? 'workflow',
    sourceType: data?.sourceType ?? 'other',
    sourceDetails: data?.sourceDetails ?? {},
    metadata: data?.metadata ?? {},
});

export const createBrokerDestination = (data?: Partial<BrokerDestination>): BrokerDestination => ({
    ...data,
});

export const createWorkflowMetadata = (data?: Partial<WorkflowMetadata>): WorkflowMetadata => ({
    ...data,
});

// Default values for new items
export const getDefaultInputMapping = (): InputMapping => createInputMapping({
    type: 'arg_mapping',
    arg_name: 'new_input',
    ready: false,
});

export const getDefaultOutput = (): Output => createOutput({
    name: 'new_output',
    is_default_output: false,
    data_type: 'string',
});

export const getDefaultDependency = (): Dependency => createDependency({
    type: 'workflow',
});

export const getDefaultBrokerSourceConfig = (): BrokerSourceConfig => createBrokerSourceConfig({
    brokerId: `broker_${Date.now()}`,
    scope: 'workflow',
    sourceType: 'other',
});

export const getDefaultBrokerDestination = (): BrokerDestination => createBrokerDestination({
    id: `destination_${Date.now()}`,
    type: 'default',
});

// Helper functions to convert arrays safely
export const ensureInputMappingArray = (data: any): InputMapping[] => {
    if (!Array.isArray(data)) return [];
    return data.map(createInputMapping);
};

export const ensureOutputArray = (data: any): Output[] => {
    if (!Array.isArray(data)) return [];
    return data.map(createOutput);
};

export const ensureDependencyArray = (data: any): Dependency[] => {
    if (!Array.isArray(data)) return [];
    return data.map(createDependency);
};

export const ensureBrokerSourceConfigArray = (data: any): BrokerSourceConfig[] => {
    if (!Array.isArray(data)) return [];
    return data.map(createBrokerSourceConfig);
};

export const ensureBrokerDestinationArray = (data: any): BrokerDestination[] => {
    if (!Array.isArray(data)) return [];
    return data.map(createBrokerDestination);
};

// Validation helpers
export const validateInputMapping = (input: InputMapping): boolean => {
    return !!(input.arg_name && input.arg_name.trim().length > 0);
};

export const validateOutput = (output: Output): boolean => {
    return !!(output.name && output.name.trim().length > 0);
};

export const validateDependency = (dependency: Dependency): boolean => {
    return !!(dependency.type && dependency.id);
};

export const validateBrokerSourceConfig = (source: BrokerSourceConfig): boolean => {
    return !!(source.brokerId && source.brokerId.trim().length > 0 && source.sourceType);
};

// Array manipulation helpers
export const findInputMappingIndex = (inputs: InputMapping[], predicate: (input: InputMapping) => boolean): number => {
    return inputs.findIndex(predicate);
};

export const findOutputIndex = (outputs: Output[], predicate: (output: Output) => boolean): number => {
    return outputs.findIndex(predicate);
};

export const findDependencyIndex = (dependencies: Dependency[], predicate: (dependency: Dependency) => boolean): number => {
    return dependencies.findIndex(predicate);
};

export const findSourceIndex = (sources: BrokerSourceConfig[], predicate: (source: BrokerSourceConfig) => boolean): number => {
    return sources.findIndex(predicate);
};

export const findDestinationIndex = (destinations: BrokerDestination[], predicate: (destination: BrokerDestination) => boolean): number => {
    return destinations.findIndex(predicate);
};

// Complex array state helpers
export const hasValidInputs = (inputs: InputMapping[] | null): boolean => {
    return !!(inputs && inputs.length > 0 && inputs.some(validateInputMapping));
};

export const hasValidOutputs = (outputs: Output[] | null): boolean => {
    return !!(outputs && outputs.length > 0 && outputs.some(validateOutput));
};

export const hasValidDependencies = (dependencies: Dependency[] | null): boolean => {
    return !!(dependencies && dependencies.length > 0 && dependencies.some(validateDependency));
};

export const hasValidSources = (sources: BrokerSourceConfig[] | null): boolean => {
    return !!(sources && sources.length > 0 && sources.some(validateBrokerSourceConfig));
};
