import { Node, Edge } from "reactflow";
import { DbFunctionNode, WorkflowNode } from "@/features/workflows/types";



export function extractExecutionNodes(nodes: WorkflowNode[]): DbFunctionNode[] {
    return nodes
        .filter((node) => (node.type !== "userInput" && node.type !== "brokerRelay"))
        .map((node) => node.data as DbFunctionNode);
}

/**
 * Extract user inputs for socket execution
 */
export function extractUserInputs(nodes: Node[]): Array<{ broker_id: string; default_value: any }> {
    return nodes
        .filter((node) => node.data.type === "userInput")
        .map((node) => ({
            broker_id: node.data.broker_id,
            default_value: node.data.default_value || "",
        }));
}

/**
 * Extract relays for socket execution
 */
export function extractRelays(nodes: Node[]): Array<{ source_broker_id: string; target_broker_ids: string[] }> {
    return nodes
        .filter((node) => node.data.type === "brokerRelay")
        .map((node) => ({
            source_broker_id: node.data.source_broker_id,
            target_broker_ids: node.data.target_broker_ids || [],
        }));
}

/**
 * Helper function to save user input session values as persistent defaults
 * Call this when you want to persist the current session values
 */
export function prepareUserInputsForSaving(nodes: Node[]): Array<{ id: string; default_value: string }> {
    return nodes
        .filter((node) => node.data.type === "userInput")
        .map((node) => ({
            id: node.data.id,
            default_value: node.data.value || "",
        }));
}
