// Internal structure types matching Python dataclasses

import { UserDataReference } from "@/components/user-generated-table-data/tableReferences";
import { BrokerMapEntry } from "../brokerSlice";
import { Viewport } from "@xyflow/react";

export type NodeInputType = "arg_override" | "arg_mapping" | "user_input" | "environment" | "broker";

export interface InputMapping {
    type?: NodeInputType;
    arg_name?: string | null;
    source_broker_id?: string | null;
    default_value?: any;
    ready?: boolean;
    metadata?: Record<string, any>;
}

export interface ArgMapping {
    arg_name: string;
    ready: boolean;
}

// Simple type mapping
type MappingDetails = {
    user_input: BrokerMapEntry;
    arg_mapping: ArgMapping;
    dependency: Record<string, any>;
    environment: Record<string, any>;
    other: Record<string, any>;
};

export interface InputConfig<T extends keyof MappingDetails = keyof MappingDetails> {
    mappingType: T;
    scope: "global" | "session" | "task" | "organization" | "user" | "workflow" | "action" | "temporary" | string;
    scopeId: string;
    brokerId: string;
    mappingDetails: MappingDetails[T];
    extraction?: "label" | "id" | "object" | "string" | null;
    metadata?: Record<string, any> | null;
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

export interface BrokerDestination {
    [key: string]: any;
}

// Simple type mapping
type SourceDetailsMap = {
    user_data: UserDataReference;
    user_input: BrokerMapEntry;
    user_list: Record<string, any>;
    system_table: Record<string, any>;
    api: Record<string, any>;
    other: Record<string, any>;
};

export interface BrokerSourceConfig<T extends keyof SourceDetailsMap = keyof SourceDetailsMap> {
    brokerId: string;
    scope: "global" | "session" | "task" | "organization" | "user" | "workflow" | "action" | "temporary" | string;
    sourceType: T;
    sourceDetails: SourceDetailsMap[T];
    extraction?: "label" | "id" | "object" | "string" | null;
    relays?: Relay[];
    metadata?: Record<string, any> | null;
}

export interface WorkflowMetadata {
    [key: string]: any;
}

export interface Workflow {
    id: string;
    name: string;
    description: string | null;
    workflow_type: string | null;
    inputs: InputMapping[] | null;
    outputs: Output[] | null;
    dependencies: Dependency[] | null;
    sources: BrokerSourceConfig[] | null;
    destinations: BrokerDestination[] | null;
    actions: any | null; // TODO: Define proper type for workflow actions
    category: string | null;
    tags: string[] | null;
    is_active: boolean | null;
    is_deleted: boolean | null;
    auto_execute: boolean | null;
    metadata: WorkflowMetadata | null;
    viewport: Viewport | null;
    user_id: string | null;
    version: number | null;
    is_public: boolean | null;
    authenticated_read: boolean | null;
    public_read: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface WorkflowState {
    entities: Record<string, Workflow>;
    ids: string[];
    activeId: string | null;
    selectedIds: string[];
    isDirty: Record<string, boolean>;
    isLoading: boolean;
    error: string | null;
    fetchTimestamp: number | null;
    dataFetched: boolean;
}

export type WorkflowCreateInput = Omit<Workflow, "id" | "created_at" | "updated_at" | "user_id" | "version">;
export type WorkflowUpdateInput = Partial<Omit<Workflow, "id" | "created_at" | "updated_at" | "user_id" | "version">>;
