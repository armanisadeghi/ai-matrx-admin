import { PythonDataType, ReactFlowUIMetadata } from "@/features/workflows/types";
import { Node } from "reactflow";

export interface DbUserInput {
    id: string;
    created_at?: string;
    updated_at?: string;
    workflow_id: string;
    user_id: string | null;
    label: string | null;
    broker_id: string;
    data_type: PythonDataType;
    default_value: any | null;
    is_required: boolean | null;
    field_component_id: string | null;
    metadata: Record<string, any>;
    ui_node_data: ReactFlowUIMetadata;
}


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
