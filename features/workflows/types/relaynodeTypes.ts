import { ReactFlowUIMetadata } from "@/features/workflows/types";
import { Node } from "reactflow";

export interface DbBrokerRelayData {
    id: string;
    created_at?: string;
    updated_at?: string;
    workflow_id: string;
    user_id: string | null;
    label: string | null;
    source_broker_id: string;
    target_broker_ids: string[];
    metadata: Record<string, any>;
    ui_node_data: ReactFlowUIMetadata;
}

export interface BrokerRelayNodeData {
    id: string;
    type: string;
    workflow_id: string;
    label: string | null;
    source_broker_id: string;
    target_broker_ids: string[];
    metadata: Record<string, any>;
    ui_node_data?: ReactFlowUIMetadata;
}

export type BrokerRelayNode = Node<BrokerRelayNodeData>;
