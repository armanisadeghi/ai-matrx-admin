// Internal structure types matching Python dataclasses


export type NodeInputType = "arg_override" | "arg_mapping" | "broker"

export interface InputMapping {
  type?: NodeInputType;
  arg_name?: string | null;
  source_broker_id?: string | null;
  default_value?: any;
  ready?: boolean;
  metadata?: Record<string, any>;
}

export interface Bookmark {
  name?: string | null;
  path?: string[];
}

export interface Result {
  component?: string | null;
  bookmark?: Bookmark | null;
  metadata?: Record<string, any>;
}

export interface Relay {
  type?: string | null;
  id?: string | null;
}

export interface Output {
  broker_id: string | null;
  is_default_output: boolean;
  name: string | null;
  bookmark: Bookmark | null;
  conversion: any;
  data_type: string | null;
  result: Result | null;
  relays?: Relay[];
  metadata: Record<string, any>;
}

export interface Dependency {
  type?: string | null;
  id?: string | null;
  metadata?: Record<string, any>;
}

// Note: BrokerSourceConfig and BrokerDestination types would need to be imported or defined
// For now, using any until those types are available
export interface BrokerSourceConfig {
  [key: string]: any;
}

export interface BrokerDestination {
  [key: string]: any;
}

export interface WorkflowData {
    id: string;
    name: string;
    description: string | null;
    workflow_type: string | null;
    inputs: InputMapping[] | null;
    outputs: Output[] | null;
    dependencies: Dependency[] | null;
    sources: BrokerSourceConfig[] | null;
    destinations: BrokerDestination[] | null;
    actions: any; // This would be WorkflowData[] but avoiding circular reference for now
    category: string | null;
    tags: any; // JSONB - define specific type when structure is known
    is_active: boolean | null;
    is_deleted: boolean | null;
    auto_execute: boolean | null;
    metadata: Record<string, any> | null;
    viewport: any; // JSONB - define specific type when structure is known
    user_id: string | null;
    version: number | null;
    is_public: boolean | null;
    authenticated_read: boolean | null;
    public_read: boolean | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface WorkflowSliceState {
    // Normalized state - workflows stored by ID
    workflows: Record<string, WorkflowData>;
    
    // UI state
    selectedWorkflowId: string | null;
    
    // Loading states
    loading: boolean;
    error: string | null;
    
    // Track dirty state for individual workflows (using array for Redux compatibility)
    dirtyWorkflows: string[];
    
    // Cache management
    lastFetched: Record<string, number>;
    staleTime: number;
  }

// Utility functions for type conversion and validation

export const createInputMapping = (data?: Partial<InputMapping>): InputMapping => ({
  type: data?.type ?? null,
  arg_name: data?.arg_name ?? null,
  source_broker_id: data?.source_broker_id ?? null,
  default_value: data?.default_value,
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