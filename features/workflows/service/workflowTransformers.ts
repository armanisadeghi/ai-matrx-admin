import { Node, Edge } from "reactflow";
import { DbFunctionNode, WorkflowNode } from "@/features/workflows/types";

export function extractExecutionNodes(nodes: WorkflowNode[]): DbFunctionNode[] {
    return nodes
        .filter((node) => node?.type !== "userInput" && node?.type !== "brokerRelay")
        .map((node) => node?.data as DbFunctionNode)
        .filter((data) => data != null); // Remove any null/undefined results
}


export function extractUserInputs(nodes: Node[]): Array<{ broker_id: string; default_value: any; value: any }> {
    return nodes
        .filter((node) => node?.data?.type === "userInput")
        .map((node) => {
            const data = node?.data || {};
            return {
                broker_id: data.broker_id || "",
                default_value: data.default_value || "",
                value: data.value || data.default_value || "",
            };
        });
}

export function extractRelays(nodes: Node[]): Array<{ source_broker_id: string; target_broker_ids: string[] }> {
    return nodes
        .filter((node) => node?.data?.type === "brokerRelay")
        .map((node) => {
            const data = node?.data || {};
            return {
                source_broker_id: data.source_broker_id || "",
                target_broker_ids: data.target_broker_ids || [],
            };
        });
}


export function prepareUserInputsForSaving(nodes: Node[]): Array<{ id: string; default_value: string }> {
    return nodes
        .filter((node) => node?.data?.type === "userInput")
        .map((node) => {
            const data = node?.data || {};
            return {
                id: data.id || "",
                default_value: data.value || "",
            };
        });
}