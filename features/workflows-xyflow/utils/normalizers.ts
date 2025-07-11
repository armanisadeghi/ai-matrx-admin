import { InputMapping } from "@/lib/redux/workflow/types";

export type SimpleBroker = {
    id: string;
    name: string;
    dataType: string;
    fieldComponentId: string;
    outputComponent: string;
};

export function normalizeBroker(broker: any | any[]): SimpleBroker | SimpleBroker[] {
    if (Array.isArray(broker)) {
        return broker.map(item => ({
            id: item.id,
            name: item.name || "Unnamed Broker",
            dataType: item.dataType || "str",
            fieldComponentId: item.fieldComponentId || "",
            outputComponent: item.outputComponent || "",
        }));
    }
    return {
        id: broker.id,
        name: broker.name || "Unnamed Broker",
        dataType: broker.dataType || "str",
        fieldComponentId: broker.fieldComponentId || "",
        outputComponent: broker.outputComponent || "",
    };
}

export function normalizeInputMapping(input: any | any[]): InputMapping | InputMapping[] {
    if (Array.isArray(input)) {
        return input.map(item => ({
            type: item.type || "unused",
            arg_name: item.arg_name || item.name || null,
            source_broker_id: item.source_broker_id || null,
            default_value: item.default_value || null,
            ready: item.ready || false,
            use_system_default: item.use_system_default || true,
            required: item.required || false,
            data_type: item.data_type || null,
            metadata: item.metadata || {},
        }));
    }
    return {
        type: input.type || "unused",
        arg_name: input.arg_name || input.name || null,
        source_broker_id: input.source_broker_id || null,
        default_value: input.default_value || null,
        ready: input.ready || false,
        use_system_default: input.use_system_default || true,
        required: input.required || false,
        data_type: input.data_type || null,
        metadata: input.metadata || {},
    };
}