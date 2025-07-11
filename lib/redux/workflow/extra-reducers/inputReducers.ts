import { PayloadAction } from "@reduxjs/toolkit";
import { WorkflowState } from "../types";

export type NodeInputType = "unused" | "arg_override" | "arg_mapping" | "user_input" | "environment" | "broker" | "direct";

export interface InputMapping {
    type: NodeInputType;
    arg_name: string | null;
    source_broker_id: string | null;
    default_value: any;
    ready: boolean;
    use_system_default: boolean;
    required: boolean;
    data_type: string;
    metadata: Record<string, any>;
}

// Default InputMapping template
const defaultInputMapping: InputMapping = {
    type: "unused",
    arg_name: null,
    source_broker_id: null,
    default_value: null,
    ready: false,
    use_system_default: false,
    required: false,
    data_type: "",
    metadata: {}
};

// Utility to normalize InputMapping
const normalizeInputMapping = (input: Partial<InputMapping>): InputMapping => ({
    ...defaultInputMapping,
    ...input
});

// Input Management Action Types
export interface UpdateInputsPayload {
    id: string;
    inputs: InputMapping[];
}

export interface AddInputPayload {
    id: string;
    input: Partial<InputMapping>;
}

export interface RemoveInputPayload {
    id: string;
    index: number;
}

export interface UpdateInputItemPayload {
    id: string;
    index: number;
    input: Partial<InputMapping>;
}

// Input Management Reducers
export const smartInputReducers = {
    updateInputsSmart: (state: WorkflowState, action: PayloadAction<UpdateInputsPayload>) => {
        const { id, inputs } = action.payload;
        if (state.entities[id]) {
            state.entities[id].inputs = inputs.map(normalizeInputMapping);
            state.isDirty[id] = true;
        }
    },

    addInputSmart: (state: WorkflowState, action: PayloadAction<AddInputPayload>) => {
        const { id, input } = action.payload;
        if (state.entities[id]) {
            if (!state.entities[id].inputs) {
                state.entities[id].inputs = [];
            }
            state.entities[id].inputs!.push(normalizeInputMapping(input));
            state.isDirty[id] = true;
        }
    },

    removeInputSmart: (state: WorkflowState, action: PayloadAction<RemoveInputPayload>) => {
        const { id, index } = action.payload;
        if (state.entities[id] && state.entities[id].inputs) {
            state.entities[id].inputs!.splice(index, 1);
            state.isDirty[id] = true;
        }
    },

    updateInputItemSmart: (state: WorkflowState, action: PayloadAction<UpdateInputItemPayload>) => {
        const { id, index, input } = action.payload;
        if (state.entities[id] && state.entities[id].inputs && state.entities[id].inputs![index]) {
            state.entities[id].inputs![index] = normalizeInputMapping(input);
            state.isDirty[id] = true;
        }
    },
};