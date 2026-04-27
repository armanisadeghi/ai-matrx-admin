import type { Database } from "@/types/database.types";
import type { NodeKnownBrokers } from "./knownBrokersTypes";

export interface WorkflowNodeMetadata {
  knownBrokers?: NodeKnownBrokers;
  ui?: Record<string, unknown>;
  custom?: Record<string, unknown>;
}

export type DbWorkflow = Database["public"]["Tables"]["workflow"]["Row"];
