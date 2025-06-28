import { DbFunctionNode } from "@/features/workflows/types";
import { getRegisteredFunctions } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";

// Interface for argument with additional data
export interface ArgumentWithData {
    name: string;
    data_type: string;
    required: boolean;
    default_value: any;
    ready?: boolean;
    mapping?:
        | {
              source_broker_id: string;
              target_arg_name: string;
          }
        | undefined;
    override?:
        | {
              name: string;
              default_value: any;
              required: boolean;
              ready: boolean;
          }
        | undefined;
}

// Interface for return broker
export interface ReturnBroker {
    id: string;
    type: "default" | "override";
}

// Function to get function data for overview
export const getFunctionDataForOverview = (functionId: string) => {
    return getRegisteredFunctions().find((f) => f.id === functionId);
};

// Function to update node with partial updates
export const updateNode = (
    nodeData: DbFunctionNode,
    onNodeUpdate: (updatedNode: DbFunctionNode) => void,
    updates: Partial<DbFunctionNode>
) => {
    onNodeUpdate({ ...nodeData, ...updates });
};

// Function to get arguments with their mappings and overrides
export const getArgumentsWithData = (nodeData: DbFunctionNode, functionData: any): ArgumentWithData[] => {
    if (!functionData) return [];

    return functionData.args.map((arg: any) => {
        const mapping = nodeData.arg_mapping?.find((m) => m.target_arg_name === arg.name);
        const override = nodeData.arg_overrides?.find((o) => o.name === arg.name);

        return {
            ...arg,
            mapping,
            override,
        };
    });
};

// Function to get all return brokers (default + overrides)
export const getAllReturnBrokers = (nodeData: DbFunctionNode, functionData: any): ReturnBroker[] => {
    const brokers: ReturnBroker[] = [];
    const defaultBrokerId = functionData?.return_broker;

    // Add override return brokers first
    if (nodeData.return_broker_overrides) {
        nodeData.return_broker_overrides.forEach((broker) => {
            brokers.push({
                id: broker,
                type: broker === defaultBrokerId ? "default" : "override",
            });
        });
    }

    // Add default return broker only if it's not already in the overrides
    if (defaultBrokerId && !nodeData.return_broker_overrides?.includes(defaultBrokerId)) {
        brokers.push({ id: defaultBrokerId, type: "default" });
    }

    return brokers;
};

// Function to check if node has dependencies
export const hasNodeDependencies = (nodeData: DbFunctionNode): boolean => {
    return !!(nodeData.additional_dependencies && nodeData.additional_dependencies.length > 0);
};

// Function to check if there are return brokers
export const hasReturnBrokers = (allReturnBrokers: ReturnBroker[]): boolean => {
    return allReturnBrokers.length > 0;
};
