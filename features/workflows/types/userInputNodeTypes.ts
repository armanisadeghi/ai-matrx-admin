import type { Database } from "@/types/database.types";
import {
  PythonDataType,
  ReactFlowUIMetadata,
} from "@/features/workflows/types";
import { Node } from "reactflow";

export type DbUserInput =
  Database["public"]["Tables"]["workflow_user_input"]["Row"];

export interface UserInputNodeData {
  id: string;
  type: string;
  workflow_id: string;
  broker_id: string;
  label: string | null;
  data_type: PythonDataType;
  default_value: any | null;
  is_required: boolean | null;
  field_component_id: string | null;
  metadata?: Record<string, any>;
  ui_node_data?: ReactFlowUIMetadata;
}

export type UserInputNode = Node<UserInputNodeData>;
