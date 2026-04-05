import type { Database } from "@/types/database.types";
import { NodeKnownBrokers } from "../utils/knownBrokersRegistry";

export interface WorkflowNodeMetadata {
  knownBrokers?: NodeKnownBrokers;
  ui?: Record<string, unknown>;
  custom?: Record<string, unknown>;
}

export type DbWorkflow = Database["public"]["Tables"]["workflow"]["Row"];
