import { cloneDeep } from "lodash";
import { getStore } from "@/lib/redux/store";
import { DataBrokerData } from "@/types";
import { WorkflowNodeData } from "@/lib/redux/workflow-node/types";
import { InputMapping, Output } from "@/lib/redux/workflow/types";

export const DEFAULT_EXCLUDE_ARG_NAMES = ["recipe_brokers", "session_manager", "user_id", "stream_handler", "internal_config_object"];
export const DEFAULT_HIDE_CONNECTIONS = ["recipe_id", "latest_version"];

export const ALL_HIDDEN_CONNECTIONS = [...DEFAULT_HIDE_CONNECTIONS, ...DEFAULT_EXCLUDE_ARG_NAMES];


// Helper function to filter broker data to only include essential fields
const filterBrokerData = (broker: any) => {
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

// Get registered functions from Redux store (primary source)
export function getRegisteredFunctions() {
    const store = getStore();
    if (!store) {
        return [];
    }

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

// Helper function to get the effective value for an argument
export const getEffectiveArgValue = (arg: any, inputMapping?: InputMapping[]): { value: any; ready: boolean } => {
    const override = inputMapping?.find((o) => o.arg_name === arg.name);
    return {
        value: override?.default_value ?? arg.default_value ?? "",
        ready: override?.ready ?? arg.ready ?? false,
    };
};

export function getNormalizedRegisteredFunctionNode(
    function_id: string,
    workflowId?: string,
    userId?: string,
    uiData?: any
): Omit<WorkflowNodeData, "id" | "created_at" | "updated_at"> {
    const function_data = getRegisteredFunctions().find((f) => f.id === function_id);
    if (!function_data) {
        throw new Error(`Function with id ${function_id} not found`);
    }

    const type = function_data.category.toLowerCase();

    

    const inputs: InputMapping[] = function_data.args
        .filter((arg) => !DEFAULT_EXCLUDE_ARG_NAMES.includes(arg.name))
        .map((arg) => ({
            type: (arg.ready === false && arg.required === true) ? "arg_mapping" : "arg_override",
            arg_name: arg.name,
            default_value: cloneDeep(arg.default_value),
            ready: arg.ready,
            metadata: {
                required: arg.required,
                data_type: arg.data_type,
                use_system_default: !arg.required || arg.ready,
            },
        }));

    const outputs: Output[] = function_data.return_broker
        ? [
              {
                  broker_id: function_data.return_broker?.id,
                  name: function_data.return_broker?.name,
                  bookmark: null,
                  conversion: null,
                  data_type: function_data.return_broker?.dataType,
                  is_default_output: true,
                  result: {
                    component: function_data.return_broker?.outputComponent,
                    bookmark: null,
                    metadata: {},
                  },
                  metadata: {},
              },
          ]
        : [];

    const node: Omit<WorkflowNodeData, "id" | "created_at" | "updated_at"> = {
        function_id: function_data.id,
        workflow_id: workflowId || null,
        type: type,
        node_type: type,
        step_name: `New ${function_data.name}`,
        execution_required: true,
        inputs: inputs,
        outputs: outputs,
        user_id: userId || null,
        ui_data: uiData || {},
        dependencies: [],
        metadata: {
            registered_function: function_data,
        },
        is_public: false,
        authenticated_read: true,
        public_read: false,
        status: "pending",
    };

    return node;
}
