import { cloneDeep } from "lodash";
import { getStore } from "@/lib/redux/store";
import { DataBrokerData } from "@/types/AutomationSchemaTypes";
import { WorkflowNode, WorkflowNodeUiData, XyFlowNodeType } from "@/lib/redux/workflow-nodes/types";
import { InputMapping, Output } from "@/lib/redux/workflow/types";
import { DEFAULT_EXCLUDE_ARG_NAMES } from "./arg-utils";
import { WorkflowNodeType } from "./nodeStyles";

// Helper function to filter broker data
const filterBrokerData = (broker: any): DataBrokerData | null => {
    if (!broker) return null;
    return {
        id: broker.id,
        name: broker.name,
        color: broker.color,
        dataType: broker.dataType,
        defaultScope: broker.defaultScope,
        defaultValue: broker.defaultValue,
        inputComponent: broker.inputComponent,
        outputComponent: broker.outputComponent,
        fieldComponentId: broker.fieldComponentId,
    };
};

// Get registered functions from Redux store
function getRegisteredFunctions(): any[] {
    const store = getStore();
    if (!store) return [];

    const state = store.getState();
    const functions = Object.values(state.entities?.registeredFunction?.records || {});
    const args = Object.values(state.entities?.arg?.records || {});
    const brokers = Object.values(state.entities?.dataBroker?.records || {}) as DataBrokerData[];

    return functions.map((func: any) => {
        const fullBroker = brokers.find((broker: any) => broker.id === func.returnBroker) || func.return_broker;
        return {
            id: func.id,
            name: func.name,
            return_broker: filterBrokerData(fullBroker),
            description: func.description,
            category: func.category,
            node_description: func.nodeDescription,
            tags: func.tags,
            icon: func.icon,
            args: args
                .filter((arg: any) => arg.registeredFunction === func.id)
                .filter((arg: any) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name))
                .map((arg: any) => ({
                    name: arg.name,
                    required: arg.required,
                    data_type: arg.dataType,
                    ready: arg.ready,
                    default_value: arg.defaultValue?.value,
                    description: arg.description,
                    examples: arg.examples,
                })),
        };
    });
}

// Generate inputs from registered function
export function generateNodeInputs(functionData: any): InputMapping[] {
    return functionData.args
        .filter((arg) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name))
        .map((arg) => ({
            type: arg.ready === false && arg.required === true ? "arg_mapping" : "arg_override",
            arg_name: arg.name,
            default_value: cloneDeep(arg.default_value),
            ready: arg.ready,
            metadata: {
                required: arg.required,
                data_type: arg.data_type,
                use_system_default: !arg.required || arg.ready,
            },
        }));
}

// Generate outputs from registered function
export function generateNodeOutputs(functionData: any): Output[] {
    return functionData.return_broker
        ? [
              {
                  broker_id: functionData.return_broker.id,
                  name: functionData.return_broker.name,
                  bookmark: null,
                  conversion: null,
                  data_type: functionData.return_broker.dataType,
                  is_default_output: true,
                  result: {
                      component: functionData.return_broker.outputComponent,
                      bookmark: null,
                      metadata: {},
                  },
                  metadata: {},
              },
          ]
        : [];
}

// Main function to create normalized node
export function getNormalizedRegisteredFunctionNode(
    type: XyFlowNodeType = "workflowNode",
    functionId: string,
    workflowId: string,
    userId: string,
    uiData?: WorkflowNodeUiData
): Omit<WorkflowNode, "id" | "created_at" | "updated_at"> {
    const functionData = getRegisteredFunctions().find((f) => f.id === functionId);
    if (!functionData) {
        throw new Error(`Function with id ${functionId} not found`);
    }
    const nodeType = functionData.category.toLowerCase();

    const randomXOffset = Math.floor(Math.random() * 11) * 10;
    const randomYOffset = Math.floor(Math.random() * 11) * 10;

    return {
        function_id: functionData.id,
        workflow_id: workflowId,
        type: type,
        node_type: nodeType,
        step_name: `New ${functionData.name}`,
        execution_required: true,
        inputs: generateNodeInputs(functionData),
        outputs: generateNodeOutputs(functionData),
        user_id: userId,
        is_active: true,
        ui_data: uiData || {
            width: 250,
            height: 125,
            position: {
                x: 500 + randomXOffset,
                y: 250 + randomYOffset,
            },
        },
        dependencies: [],
        metadata: {
            registered_function: functionData,
        },
        is_public: false,
        authenticated_read: true,
        public_read: false,
    };
}

// Utility to reset specific node parts
export function resetNodePart(node: WorkflowNode, functionData: any, part: "inputs" | "outputs"): WorkflowNode {
    return {
        ...node,
        [part]: part === "inputs" ? generateNodeInputs(functionData) : generateNodeOutputs(functionData),
    };
}

export function generateInputsFromDefinition(nodeDefinition: any): InputMapping[] {
    return nodeDefinition.inputs
        .filter((input: any) => input.input_type === "argument")
        .map((input: any) => {
            // Find the matching argument by name
            const matchingArg = nodeDefinition.arguments.find((arg: any) => arg.name === input.name);

            if (!matchingArg) {
                throw new Error(`No matching argument found for input: ${input.name}`);
            }

            return {
                type: matchingArg.ready === false && matchingArg.required === true ? "arg_mapping" : "arg_override",
                arg_name: matchingArg.name,
                default_value: cloneDeep(matchingArg.default_value),
                ready: matchingArg.ready,
                metadata: {
                    required: matchingArg.required,
                    data_type: matchingArg.data_type,
                    use_system_default: !matchingArg.required || matchingArg.ready,
                },
            };
        });
}

export function generateInputByName(nodeDefinition: any, argName: string): InputMapping {
    // Find the input with the matching name and input_type: "argument"
    const input = nodeDefinition.inputs.find((input: any) => input.name === argName && input.input_type === "argument");

    if (!input) {
        throw new Error(`No input found with name "${argName}" and input_type "argument"`);
    }

    // Find the matching argument by name
    const matchingArg = nodeDefinition.arguments.find((arg: any) => arg.name === argName);

    if (!matchingArg) {
        throw new Error(`No matching argument found for input: ${argName}`);
    }

    return {
        type: matchingArg.ready === false && matchingArg.required === true ? "arg_mapping" : "arg_override",
        arg_name: matchingArg.name,
        default_value: cloneDeep(matchingArg.default_value),
        ready: matchingArg.ready,
        metadata: {
            required: matchingArg.required,
            data_type: matchingArg.data_type,
            use_system_default: !matchingArg.required || matchingArg.ready,
        },
    };
}

export function generateInputsByNames(nodeDefinition: any, argNames: string[]): InputMapping[] {
    // Return empty array if argNames is empty
    if (!argNames || argNames.length === 0) {
        return [];
    }

    return nodeDefinition.inputs
        .filter((input: any) => input.input_type === "argument" && argNames.includes(input.name))
        .map((input: any) => {
            // Find the matching argument by name
            const matchingArg = nodeDefinition.arguments.find((arg: any) => arg.name === input.name);

            if (!matchingArg) {
                // Skip if no matching argument is found
                return null;
            }

            return {
                type: matchingArg.ready === false && matchingArg.required === true ? "arg_mapping" : "arg_override",
                arg_name: matchingArg.name,
                default_value: cloneDeep(matchingArg.default_value),
                ready: matchingArg.ready,
                metadata: {
                    required: matchingArg.required,
                    data_type: matchingArg.data_type,
                    use_system_default: !matchingArg.required || matchingArg.ready,
                },
            };
        })
        .filter((mapping: InputMapping | null): mapping is InputMapping => mapping !== null);
}
