import type { Database } from "@/types/database.types";
import type { ReactFlowUIMetadata } from "@/features/workflows/types/workflowReactFlowTypes";
import { Node } from "reactflow";

export type DbBrokerRelayData =
  Database["public"]["Tables"]["workflow_relay"]["Row"];

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
