// components/SchemaVisualizer/types.ts
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import {AutomationEntity, EntityKeys} from "@/types/entityTypes";

export interface SchemaNodeData {
    label: string;
    entity: AutomationEntity<EntityKeys>;
}

export type SchemaNode = ReactFlowNode<SchemaNodeData>;
export type SchemaEdge = ReactFlowEdge;
