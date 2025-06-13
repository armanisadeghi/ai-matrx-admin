import { Viewport } from "reactflow";
import { NodeKnownBrokers } from "../utils/knownBrokersRegistry";

export interface WorkflowNodeMetadata {
    knownBrokers?: NodeKnownBrokers;
    ui?: Record<string, any>;
    custom?: Record<string, any>;
}

export interface DbWorkflow {
    id: string;
    created_at?: string;
    updated_at?: string;
    name: string;
    description: string | null;
    user_id: string;
    version: number;
    is_public: boolean;
    authenticated_read: boolean;
    public_read: boolean;
    is_active: boolean;
    is_deleted: boolean;
    auto_execute: boolean;
    category: string | null;
    tags: string[] | null;
    metadata: WorkflowNodeMetadata;
    viewport: Viewport;
}
