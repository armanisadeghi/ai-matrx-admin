import { supabase } from "@/utils/supabase/client";
import { DbWorkflowEdge, EnrichedEdgeData, WorkflowEdge } from "@/features/workflows/types";

export function edgeToReactFlow(dbEdge: DbWorkflowEdge): WorkflowEdge {
    const edgeData: EnrichedEdgeData = {
        id: dbEdge.id,
        source_node_id: dbEdge.source_node_id,
        target_node_id: dbEdge.target_node_id,
        source_handle: dbEdge.source_handle,
        target_handle: dbEdge.target_handle,
        edge_type: dbEdge.edge_type,
        animated: dbEdge.animated,
        style: dbEdge.style,
        connectionType: dbEdge.metadata?.connectionType,
        sourceBrokerId: dbEdge.metadata?.sourceBrokerId || "",
        sourceBrokerName: dbEdge.metadata?.sourceBrokerName || "",
        targetBrokerId: dbEdge.metadata?.targetBrokerId || "",
        targetBrokerName: dbEdge.metadata?.targetBrokerName || "",
        metadata: dbEdge.metadata || {},
        label: dbEdge.metadata?.label || "",
    };

    return {
        id: dbEdge.id,
        source: dbEdge.source_node_id,
        target: dbEdge.target_node_id,
        sourceHandle: dbEdge.source_handle,
        targetHandle: dbEdge.target_handle,
        type: dbEdge.edge_type || "default",
        animated: dbEdge.animated || false,
        style: dbEdge.style || {},
        data: edgeData,
    };
}

export function reactFlowToEdge(reactFlowEdge: WorkflowEdge): Partial<DbWorkflowEdge> {
    const edgeData = reactFlowEdge.data;

    return {
        id: reactFlowEdge.id,
        source_node_id: reactFlowEdge.source,
        target_node_id: reactFlowEdge.target,
        source_handle: reactFlowEdge.sourceHandle,
        target_handle: reactFlowEdge.targetHandle,
        edge_type: reactFlowEdge.type,
        animated: reactFlowEdge.animated,
        style: reactFlowEdge.style,
        metadata: {
            connectionType: edgeData.connectionType,
            sourceBrokerId: edgeData.sourceBrokerId,
            sourceBrokerName: edgeData.sourceBrokerName,
            targetBrokerId: edgeData.targetBrokerId,
            targetBrokerName: edgeData.targetBrokerName,
            isKnownBroker: edgeData.metadata?.isKnownBroker,
            knownBrokerData: edgeData.metadata?.knownBrokerData,
            virtualEdgeFingerprint: edgeData.metadata?.virtualEdgeFingerprint,
            label: edgeData.label,
            ...edgeData.metadata,
        },
    };
}

export function createVirtualEdgeFingerprint(source: string, target: string, brokerId: string, connectionType: string): string {
    return `virtual_${source}_${target}_${brokerId}_${connectionType}`;
}

export function convertVirtualToSaved(virtualEdge: any, workflowId: string): Partial<DbWorkflowEdge> {
    const fingerprint = createVirtualEdgeFingerprint(
        virtualEdge.source,
        virtualEdge.target,
        virtualEdge.data.sourceBrokerId,
        virtualEdge.data.connectionType
    );

    return {
        workflow_id: workflowId,
        source_node_id: virtualEdge.source,
        target_node_id: virtualEdge.target,
        source_handle: virtualEdge.sourceHandle,
        target_handle: virtualEdge.targetHandle,
        edge_type: virtualEdge.type,
        animated: virtualEdge.animated,
        style: virtualEdge.style,
        metadata: {
            ...virtualEdge.data.metadata,
            virtualEdgeFingerprint: fingerprint,
            connectionType: virtualEdge.data.connectionType,
            sourceBrokerId: virtualEdge.data.sourceBrokerId,
            sourceBrokerName: virtualEdge.data.sourceBrokerName,
            targetBrokerId: virtualEdge.data.targetBrokerId,
            targetBrokerName: virtualEdge.data.targetBrokerName,
            label: virtualEdge.data.label,
        },
    };
}

export function batchEdgesToReactFlow(dbEdges: DbWorkflowEdge[]): WorkflowEdge[] {
    return dbEdges.map(edgeToReactFlow);
}

export async function saveWorkflowEdge(workflowId: string, edgeData: Partial<WorkflowEdge>): Promise<DbWorkflowEdge | null> {
    if (edgeData.id?.startsWith("virtual_")) {
        throw new Error(`Attempted to save virtual edge with ID: ${edgeData.id}. Virtual edges should be filtered out before saving.`);
    }

    const { data: edge, error } = await supabase
        .from("workflow_edge")
        .upsert({
            ...edgeData,
            workflow_id: workflowId,
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to save edge: ${error.message}`);
    return edge;
}

export async function deleteWorkflowEdge(edgeId: string): Promise<void> {
    const { error } = await supabase.from("workflow_edge").delete().eq("id", edgeId);
    if (error) throw new Error(`Failed to delete edge: ${error.message}`);
}
