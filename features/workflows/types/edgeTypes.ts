import { DataBrokerData } from "@/types/AutomationSchemaTypes";
import { Edge } from "reactflow";

export interface DbWorkflowEdge {
    id: string;
    created_at?: string;
    updated_at?: string;
    workflow_id: string;
    source_node_id: string;
    target_node_id: string;
    source_handle: string | null;
    target_handle: string | null;
    edge_type: string | null;
    animated: boolean | null;
    style: React.CSSProperties | null;
    metadata: Record<string, any>;
}

export interface EnrichedEdgeData {
    id: string;
    source_node_id: string;
    target_node_id: string;
    source_handle: string | null;
    target_handle: string | null;
    edge_type: string | null;
    animated: boolean | null;
    style: React.CSSProperties | null;
    connectionType?: string;
    sourceBrokerId: string;
    sourceBrokerName: string;
    targetBrokerId: string;
    targetBrokerName: string;
    metadata: {
        isKnownBroker?: boolean;
        knownBrokerData?: DataBrokerData;
        virtualEdgeFingerprint?: string;
        [key: string]: any;
    };
    label: string;
}

export type WorkflowEdge = Edge<EnrichedEdgeData>;
